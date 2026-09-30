import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, Clock } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { followUpTone, formatCurrency, formatDateTime, formatDay, formatElapsed } from '../../../lib/format.ts'
import { ConversationButton } from '../../conversations/components/ConversationButton.tsx'
import { LeadAvatar } from '../../leads/components/LeadAvatar.tsx'
import { SourceIcon } from '../../leads/components/SourceIcon.tsx'
import { WhatsAppLink } from '../../leads/components/WhatsAppLink.tsx'
import type { Lead } from '../../leads/types.ts'
import { cardActions } from '../cardActions.ts'

// Card de lead (BRAND.md, seção 8): corpo com iniciais, nome e origem (com ícone do canal); rodapé separado por
// divisória com o valor (verde na etapa final) e o tempo desde a última movimentação.
// `actions`: quantos botões (WhatsApp, conversa do direct) o SortableLeadCard sobrepõe no canto direito
// do corpo; o nome deixa o espaço deles livre.
export function LeadCard({
  lead,
  closed,
  dragging = false,
  actions = 0,
}: {
  lead: Lead
  closed: boolean
  dragging?: boolean
  actions?: number
}) {
  return (
    <div
      className={`rounded-md border transition-colors ${
        dragging ? '-rotate-[1.5deg] border-cyan bg-navy-drag shadow-drag' : 'bg-navy-800'
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-3">
        <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
        <div className={`min-w-0 flex-1 ${actions === 2 ? 'pr-16' : actions === 1 ? 'pr-8' : ''}`}>
          <p className="line-clamp-2 text-ui font-bold text-white">{lead.name}</p>
          {lead.source && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <SourceIcon source={lead.source} />
              <span className="truncate">{lead.source}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-3.5 py-2.5">
        {lead.estimatedValue ? (
          <span className={`text-ui font-bold ${closed ? 'text-success' : 'text-white'}`}>
            {formatCurrency(lead.estimatedValue)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">Sem valor</span>
        )}
        {lead.followUpAt && !dragging ? (
          <FollowUpBadge dueAt={lead.followUpAt} note={lead.followUpNote} />
        ) : (
          <time
            dateTime={lead.updatedAt}
            title="Última movimentação"
            className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${dragging ? 'text-cyan' : 'text-slate-400'}`}
          >
            <Clock aria-hidden size={13} strokeWidth={1.75} />
            {dragging ? 'agora' : formatElapsed(lead.updatedAt)}
          </time>
        )}
      </div>
    </div>
  )
}

const FOLLOW_UP_TONE = { overdue: 'text-danger', today: 'text-warning', future: 'text-slate-400' } as const

/** Próximo contato no rodapé do card: vermelho se atrasado, amarelo se hoje (BRAND.md, seção 8 · "Card de lead"). */
function FollowUpBadge({ dueAt, note }: { dueAt: string; note: string | null }) {
  const tone = followUpTone(dueAt)
  const label = tone === 'overdue' ? 'Atrasado' : formatDay(new Date(dueAt))
  return (
    <time
      dateTime={dueAt}
      title={`Próximo contato: ${formatDateTime(dueAt)}${note ? ` · ${note}` : ''}`}
      className={`flex shrink-0 items-center gap-1 text-xs font-bold ${FOLLOW_UP_TONE[tone]}`}
    >
      <Bell aria-hidden size={13} strokeWidth={1.75} />
      <span className="sr-only">Próximo contato: </span>
      {label}
    </time>
  )
}

/**
 * Card arrastável. Clique ou Enter abre a edição; Espaço pega o card para mover pelo teclado.
 * Com `disabled` (ex.: busca ativa) o card só abre, não arrasta.
 * Os botões de WhatsApp e da conversa do direct ficam FORA da área arrastável (irmãos, sobrepostos no
 * canto): assim não há elemento interativo dentro do card, e Enter/clique neles não abrem a edição nem
 * iniciam o arraste. O WhatsApp aparece no hover/foco do card no desktop (grupo nomeado `card`: a coluna
 * também é `group`) e sempre em toque; a conversa fica sempre à vista (a bolinha verde diz que dá para
 * responder agora).
 */
export function SortableLeadCard({
  lead,
  closed,
  disabled = false,
  onOpen,
}: {
  lead: Lead
  closed: boolean
  disabled?: boolean
  onOpen: (lead: Lead) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead' },
    disabled,
  })

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault()
      onOpen(lead)
      return
    }
    listeners?.onKeyDown?.(event)
  }


  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group/card relative ${isDragging ? 'opacity-40' : ''}`}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onKeyDown={handleKeyDown}
        onClick={() => onOpen(lead)}
        aria-roledescription={disabled ? undefined : 'card arrastável'}
        aria-label={disabled ? `${lead.name}. Enter para editar.` : `${lead.name}. Enter para editar, Espaço para mover.`}
        className={`rounded-md transition-colors hover:[&>div]:border-navy-600 ${
          disabled ? 'cursor-pointer' : 'cursor-grab'
        }`}
      >
        <LeadCard lead={lead} closed={closed} actions={cardActions(lead)} />
      </div>
      {!isDragging && cardActions(lead) > 0 && (
        <div className="absolute top-3 right-2.5 flex">
          <WhatsAppLink
            name={lead.name}
            phone={lead.phone}
            className="opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          />
          <ConversationButton lead={lead} />
        </div>
      )}
    </div>
  )
}
