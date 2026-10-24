import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ListPageHeaderProps = {
  icon?: ComponentType<{ className?: string }>
  title: string
  totalItems?: number
  actions?: ReactNode
  className?: string
}

function ListPageHeader({ icon: Icon, title, totalItems, actions, className }: ListPageHeaderProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-6', className)}>
      {totalItems != null && (
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
          {totalItems.toLocaleString('pt-BR')} {totalItems === 1 ? 'registro' : 'registros'}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
          <h1 className="text-2xl font-semibold text-foreground leading-tight tracking-tight truncate">{title}</h1>
        </div>
        {actions && <div className="list-header-actions flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

export { ListPageHeader }
