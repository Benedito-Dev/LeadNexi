import { memo, useEffect, useRef, useState } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { Eye, MessageSquare, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatPhoneBR } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Lead } from '../types'
import { DropIndicator } from './DropIndicator'
import { ehHoje } from '../datas'

type KanbanCardProps = {
  lead: Lead
  columnId: string
  onClick: (lead: Lead) => void
}

/** Card do lead no quadro: arrastável, com indicador de onde vai cair. */
export const KanbanCard = memo(function KanbanCard({ lead, columnId, onClick }: KanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const contatoHoje = ehHoje(lead.followUpAt)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'card', cardId: lead.id, sourceColumnId: columnId, cardName: lead.name }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [lead.id, lead.name, columnId])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      getData: ({ input, element }) =>
        attachClosestEdge({ type: 'card', cardId: lead.id, columnId }, { input, element, allowedEdges: ['top', 'bottom'] }),
      canDrop: ({ source }) => source.data.type === 'card' && source.data.cardId !== lead.id,
      onDragEnter: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
      onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    })
  }, [lead.id, columnId])

  return (
    <div className="relative animate-kanban-card-enter">
      {closestEdge === 'top' && <DropIndicator edge="top" />}
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={`Lead ${lead.name}`}
        aria-roledescription="arrastável"
        onClick={() => onClick(lead)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(lead)
          }
        }}
        className={cn(
          'relative rounded-lg bg-card border border-border/70 p-3',
          'shadow-card',
          'hover:border-leadnexi-violet/50 hover:-translate-y-0.5',
          'transition-all duration-200 ease-out',
          'cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-30 scale-[0.97] rotate-[1.5deg] shadow-lg',
        )}
      >
        {/* Sem etiqueta colorida (o LeadNexi não tem etiquetas): fica a linha de destaque no topo */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/10 rounded-t-lg" />

        <h4 className="text-sm font-semibold text-foreground leading-tight">{lead.name}</h4>

        {lead.phone && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" />
            {formatPhoneBR(lead.phone)}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="text-xs">{lead._count?.activities ?? 0}</span>
          </div>
          {lead.source && (
            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
              {lead.source}
            </Badge>
          )}
          {contatoHoje && <div className="ml-auto h-2 w-2 rounded-full bg-destructive animate-pulse" />}
        </div>
      </div>
      {closestEdge === 'bottom' && <DropIndicator edge="bottom" />}
    </div>
  )
})
