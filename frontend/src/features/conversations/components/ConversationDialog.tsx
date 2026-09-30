import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { InstagramLink } from '../../leads/components/InstagramLink.tsx'
import { LeadAvatar } from '../../leads/components/LeadAvatar.tsx'
import type { Lead } from '../../leads/types.ts'
import { Conversation } from './Conversation.tsx'

type DialogLead = Pick<Lead, 'id' | 'name' | 'instagramUsername' | 'avatarId'>

// Modal da conversa do direct (BRAND.md, seção 8 · "Conversa do direct"), aberto pelo card do
// Kanban: foto, nome e @ no topo, com "abrir no Instagram" e fechar. Ocupa a tela toda no celular.
// O conteúdo só é montado enquanto aberto (a conversa só é buscada com o modal na tela).
export function ConversationDialog({
  lead,
  open,
  onClose,
}: {
  lead: DialogLead
  open: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={`Conversa com ${lead.name}`}
      onClose={onClose}
      // Clique no fundo escurecido fecha
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto h-[min(720px,calc(100dvh-32px))] max-h-none w-[min(560px,calc(100vw-32px))] max-w-none flex-col rounded-xl border border-navy-600 bg-navy-800 p-0 text-white shadow-float backdrop:bg-backdrop open:flex max-sm:h-dvh max-sm:w-screen max-sm:rounded-none max-sm:border-0"
    >
      {open && (
        <>
          <header className="flex items-center gap-3 border-b px-5 py-4">
            <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-h2">{lead.name}</h2>
              {lead.instagramUsername && (
                <p className="truncate text-small text-slate-400">@{lead.instagramUsername}</p>
              )}
            </div>
            <InstagramLink name={lead.name} username={lead.instagramUsername} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
            >
              <X aria-hidden size={20} strokeWidth={1.75} />
            </button>
          </header>
          <Conversation lead={lead} />
        </>
      )}
    </dialog>
  )
}
