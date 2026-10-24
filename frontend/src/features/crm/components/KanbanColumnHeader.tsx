import { memo } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type KanbanColumnHeaderProps = {
  title: string
  count: number
  onAddProspect: () => void
}

/** Título da etapa, contador e menu de ações da coluna. */
export const KanbanColumnHeader = memo(function KanbanColumnHeader({ title, count, onAddProspect }: KanbanColumnHeaderProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 bg-primary/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold tabular-nums">
            {count}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`Ações da coluna ${title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddProspect}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="h-[1px] bg-primary/15" />
    </div>
  )
})
