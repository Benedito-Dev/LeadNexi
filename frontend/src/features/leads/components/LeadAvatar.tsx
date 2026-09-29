function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

/** Iniciais do lead num círculo de 32px (BRAND.md, seção 8 · "Card de lead" e "Tabela"). */
export function LeadAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-tint text-xs font-extrabold text-slate-300"
    >
      {initials(name)}
    </span>
  )
}
