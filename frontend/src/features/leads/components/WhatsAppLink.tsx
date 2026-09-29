import { WhatsAppIcon } from '../../../brand/icons.tsx'
import { whatsappUrl } from '../../../lib/format.ts'

/**
 * Botão que abre a conversa com o lead no WhatsApp (nova aba). Sem telefone válido, não aparece;
 * com `reserveSpace`, deixa o espaço vazio para manter o alinhamento das linhas.
 */
export function WhatsAppLink({
  name,
  phone,
  reserveSpace = false,
  className = '',
}: {
  name: string
  phone: string | null
  reserveSpace?: boolean
  className?: string
}) {
  const url = phone ? whatsappUrl(phone) : null
  if (!url) return reserveSpace ? <span aria-hidden className={`size-8 shrink-0 ${className}`} /> : null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={`Conversar com ${name} no WhatsApp`}
      title="Conversar no WhatsApp"
      className={`grid size-8 shrink-0 place-items-center rounded-sm text-cyan transition-colors hover:bg-cyan-tint ${className}`}
    >
      <WhatsAppIcon aria-hidden size={18} />
    </a>
  )
}
