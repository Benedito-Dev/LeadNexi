import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DadosDaColuna, Etapa, Lead } from '../types'
import { KanbanCard } from './KanbanCard'
import { KanbanColumnHeader } from './KanbanColumnHeader'
import { KanbanColumnSkeleton } from './KanbanColumnSkeleton'

type KanbanColumnProps = {
  column: Etapa
  columnData: DadosDaColuna | undefined
  onLoadMore: (columnId: string) => void
  onCardClick: (lead: Lead) => void
  onAddProspect: (columnId: string) => void
  isLoading: boolean
}

/**
 * Coluna do quadro. O backend já entrega a etapa inteira; a coluna mostra 20 por vez e
 * revela mais ao rolar até o fim (o mesmo "X de Y" da rolagem infinita do Rizar).
 */
export const KanbanColumn = memo(function KanbanColumn({
  column,
  columnData,
  onLoadMore,
  onCardClick,
  onAddProspect,
  isLoading,
}: KanbanColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  const todos = columnData?.results ?? []
  const results = todos.slice(0, columnData?.visiveis ?? 0)
  const hasMore = results.length < todos.length
  const contador = `${results.length} de ${todos.length}`

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scrollContainer = scrollRef.current
    if (!sentinel || !scrollContainer) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) onLoadMore(column.id)
      },
      { threshold: 0.5, root: scrollContainer },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, column.id])

  useEffect(() => {
    const el = columnRef.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'column', columnId: column.id }),
      canDrop: ({ source }) => source.data.type === 'card',
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [column.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    return autoScrollForElements({ element: el, canScroll: ({ source }) => source.data.type === 'card' })
  }, [])

  const handleAddProspect = useCallback(() => onAddProspect(column.id), [column.id, onAddProspect])

  return (
    <div
      ref={columnRef}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[300px]',
        'bg-card rounded-xl border border-border shadow-sm',
        'snap-center',
        'transition-all duration-200 ease-out',
        isOver && ['border-primary/40 ring-2 ring-primary/15', 'animate-column-drop-glow'],
      )}
    >
      <KanbanColumnHeader title={column.name} count={todos.length} onAddProspect={handleAddProspect} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/20 rounded-b-xl"
        style={{ maxHeight: 'calc(100vh - 340px)' }}
      >
        {isLoading || !columnData ? (
          <KanbanColumnSkeleton />
        ) : (
          <>
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 opacity-30" />
                </div>
                <p className="text-sm font-medium opacity-60">Nenhum lead</p>
                <p className="text-xs opacity-40 mt-0.5">nesta etapa</p>
              </div>
            ) : (
              results.map((lead) => <KanbanCard key={lead.id} lead={lead} columnId={column.id} onClick={onCardClick} />)
            )}

            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-2 shrink-0">
                <span className="text-xs text-muted-foreground">{contador}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})
