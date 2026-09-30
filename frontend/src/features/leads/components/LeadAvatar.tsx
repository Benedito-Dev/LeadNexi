import { useState } from 'react'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

/**
 * Foto do lead num círculo de 32px (BRAND.md, seção 8 · "Card de lead" e "Tabela"): a foto de
 * perfil do Instagram, quando o lead veio do direct; senão (ou se a foto não carregar), as iniciais.
 */
export function LeadAvatar({ name, avatarId }: { name: string; avatarId?: string | null }) {
  // Guarda qual foto falhou: foto nova (outro ID) tenta de novo
  const [failedId, setFailedId] = useState<string | null>(null)

  if (avatarId && failedId !== avatarId) {
    return (
      <img
        src={`/api/leads/avatars/${avatarId}`}
        alt=""
        loading="lazy"
        // Sem o arraste nativo de imagem do navegador: ele "roubava" o arraste do card no Funil
        draggable={false}
        onError={() => setFailedId(avatarId)}
        className="size-8 shrink-0 rounded-full bg-slate-tint object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-tint text-xs font-extrabold text-slate-300"
    >
      {initials(name)}
    </span>
  )
}
