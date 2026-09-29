import type { ReactNode } from 'react'

// Cabeçalho de página do app (BRAND.md, seção 9.1): título 26/800 e ações à direita.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <title>{`${title} · LeadNexi`}</title>
      <div>
        <h1 className="text-app-title">{title}</h1>
        {description && <p className="mt-1 text-small font-medium text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
