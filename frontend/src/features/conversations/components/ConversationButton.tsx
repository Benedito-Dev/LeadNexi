import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../leads/types.ts'
import { replyWindowOpen } from '../window.ts'
import { ConversationDialog } from './ConversationDialog.tsx'

/**
 * Botão que abre a conversa do direct num modal (card do Kanban). Só para lead que já mandou
 * direct; com a janela de 24 h aberta, ganha uma bolinha `success` (dá para responder agora).
 */
export function ConversationButton({
  lead,
  className = '',
}: {
  lead: Pick<Lead, 'id' | 'name' | 'instagramUsername' | 'instagramUserId' | 'instagramLastMessageAt' | 'avatarId'>
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!lead.instagramUserId) return null
  const canReply = replyWindowOpen(lead.instagramLastMessageAt)

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        aria-label={`Conversa com ${lead.name} no direct${canReply ? ' (dá para responder agora)' : ''}`}
        title="Conversa do direct"
        className={`relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-violet-300 transition-colors hover:bg-violet-tint ${className}`}
      >
        <MessageCircle aria-hidden size={18} strokeWidth={1.75} />
        {canReply && (
          <span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-success ring-2 ring-navy-800" />
        )}
      </button>
      <ConversationDialog lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
