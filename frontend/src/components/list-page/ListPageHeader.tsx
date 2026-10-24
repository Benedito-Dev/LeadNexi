import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ListPageHeaderProps = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  /** Resumo ao lado do título (ex.: "24 leads em Vendas"). */
  summary?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Topo fino das telas do CRM: ícone em violeta claro, título e resumo na mesma linha, e as ações
 * à direita. Usado pelo quadro e por Pipelines.
 */
function ListPageHeader({ icon: Icon, title, summary, actions, className }: ListPageHeaderProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-card px-4 py-2.5 font-marca', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-leadnexi-violet/15 text-leadnexi-violet">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 className="text-lg font-extrabold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
            {summary && <p className="truncate text-sm font-medium text-muted-foreground">{summary}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </section>
  )
}

export { ListPageHeader }
