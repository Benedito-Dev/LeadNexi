import type { ReactNode } from 'react'

// Cabeçalho de página do app (BRAND.md, seção 9.1): título 26/800 e ações à direita.
export function PageHeader({
  title,
  badge,
  description,
  actions,
}: {
  title: string
  /** Etiqueta ao lado do título (ex.: nome do funil) */
  badge?: ReactNode
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <title>{`${title} · LeadNexi`}</title>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-app-title">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-small font-medium text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex w-full items-center gap-3 sm:w-auto">{actions}</div>}
    </header>
  )
}
