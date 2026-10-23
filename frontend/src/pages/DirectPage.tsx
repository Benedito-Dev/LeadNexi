import { useQueryClient } from '@tanstack/react-query'
import { MessageCircle, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ConversationDialog } from '../features/conversations/components/ConversationDialog.tsx'
import { instagramKeys, useInbox } from '../features/instagram/hooks.ts'
import type { InboxConversation } from '../features/instagram/types.ts'
import { LeadAvatar } from '../features/leads/components/LeadAvatar.tsx'
import { useUpdateLead } from '../features/leads/hooks.ts'
import { formatAgo } from '../lib/format.ts'

type Filter = 'todas' | 'leads' | 'nao-leads'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'leads', label: 'Leads' },
  { value: 'nao-leads', label: 'Não é lead' },
]

// Inbox do direct (spec F8): todo mundo que mandou direct, da conversa mais recente para a mais
// antiga, com a última mensagem e se ainda dá para responder (janela de 24 h). Cada direct já vira
// lead sozinho; "Não é lead" tira a pessoa do funil (arquiva) e "É lead" traz de volta.
export function DirectPage() {
  const inbox = useInbox()
  const [filter, setFilter] = useState<Filter>('todas')
  const [open, setOpen] = useState<InboxConversation | null>(null)

  const conversations = (inbox.data ?? []).filter((item) =>
    filter === 'todas' ? true : filter === 'leads' ? !item.archived : item.archived,
  )
  const waiting = (inbox.data ?? []).filter((item) => item.canReply && item.lastMessage?.direction === 'received').length

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Direct"
        description={
          waiting > 0
            ? `${waiting} ${waiting === 1 ? 'conversa esperando' : 'conversas esperando'} sua resposta.`
            : 'Conversas do direct do Instagram. Quem escreve vira lead sozinho.'
        }
      />

      <div role="tablist" aria-label="Filtrar conversas" className="flex w-fit gap-0.5 rounded-md border bg-navy-750 p-0.5">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`h-9 cursor-pointer rounded-sm px-3 text-small font-bold transition-colors ${
              filter === value ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {inbox.isPending ? (
        <div aria-busy="true" aria-label="Carregando conversas" className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-20 animate-pulse rounded-xl border bg-navy-800" />
          ))}
        </div>
      ) : inbox.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar as conversas.</p>
          <Button variant="secondary" onClick={() => void inbox.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed px-6 py-10">
          <MessageCircle aria-hidden size={22} strokeWidth={1.75} className="text-slate-400" />
          <p className="text-ui font-bold text-white">
            {filter === 'todas' ? 'Nenhuma conversa ainda.' : 'Nada neste filtro.'}
          </p>
          <p className="text-small text-slate-400">
            Quando alguém mandar direct para a conta conectada, a conversa aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((item) => (
            <ConversationRow key={item.id} item={item} onOpen={() => setOpen(item)} />
          ))}
        </ul>
      )}

      {open && (
        <ConversationDialog
          lead={{ id: open.id, name: open.name, instagramUsername: open.instagramUsername, avatarId: open.avatarId }}
          open
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function ConversationRow({ item, onOpen }: { item: InboxConversation; onOpen: () => void }) {
  const queryClient = useQueryClient()
  const update = useUpdateLead()
  const last = item.lastMessage
  const waiting = item.canReply && last?.direction === 'received'

  function toggleLead() {
    update.mutate(
      { id: item.id, input: { name: item.name, archived: !item.archived } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: instagramKeys.inbox }) },
    )
  }

  return (
    <li className={`flex items-center gap-3 rounded-xl border bg-navy-800 p-3 ${item.archived ? 'opacity-80' : ''}`}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
        <LeadAvatar name={item.name} avatarId={item.avatarId} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-ui font-bold text-white">{item.name}</span>
            {waiting && <span aria-label="Esperando resposta" className="size-2 shrink-0 rounded-full bg-cyan" />}
          </span>
          <span className={`block truncate text-small ${waiting ? 'text-slate-300' : 'text-slate-400'}`}>
            {last ? `${last.direction === 'sent' ? 'Você: ' : ''}${last.text || '(sem texto)'}` : 'Sem mensagens'}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-slate-400">
            {item.instagramUsername && <span>@{item.instagramUsername}</span>}
            {last && <time dateTime={last.createdAt}>{formatAgo(last.createdAt)}</time>}
            <span className={item.archived ? 'text-slate-400' : 'text-violet-300'}>
              {item.archived ? 'Não é lead' : `Lead · ${item.stageName}`}
            </span>
            {item.canReply && <span className="text-cyan">Pode responder</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={toggleLead}
        disabled={update.isPending}
        title={item.archived ? 'Trazer de volta para o funil' : 'Tirar do funil (arquivar)'}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300 disabled:cursor-wait"
      >
        {item.archived ? <UserCheck aria-hidden size={16} strokeWidth={1.75} /> : <UserX aria-hidden size={16} strokeWidth={1.75} />}
        <span className="sr-only sm:not-sr-only">{item.archived ? 'É lead' : 'Não é lead'}</span>
      </button>
    </li>
  )
}
