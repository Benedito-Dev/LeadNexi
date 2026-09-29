import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeyboardEvent } from 'react'
import { formatCurrency, formatElapsed } from '../../../lib/format.ts'
import { SourceTag } from '../../leads/components/SourceTag.tsx'
import type { Lead } from '../../leads/types.ts'

// Card de lead compacto (BRAND.md, seção 8): nome e valor na 1ª linha, contato e tempo
// na 2ª, origem embaixo. Mono só no valor. "closed" = etapa final: valor em cyan.
export function LeadCard({ lead, closed, dragging = false }: { lead: Lead; closed: boolean; dragging?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1 rounded-md border p-3 ${
        dragging ? '-rotate-[1.5deg] border-cyan bg-navy-drag shadow-drag' : 'bg-navy-800'
      }`}
    >
      <p className="line-clamp-2 text-ui font-bold text-white">{lead.name}</p>
      {lead.estimatedValue ? (
        <span className={`font-mono text-xs ${closed ? 'text-cyan' : 'text-white'}`}>
          {formatCurrency(lead.estimatedValue)}
        </span>
      ) : (
        <span aria-label="Sem valor" className="font-mono text-xs text-slate-400">
          —
        </span>
      )}

      <p className="truncate text-small font-medium text-slate-400">{lead.phone ?? lead.email ?? ''}</p>
      <time
        dateTime={lead.updatedAt}
        title="Última movimentação"
        className={`text-right text-xs font-semibold ${dragging ? 'text-cyan' : 'text-slate-400'}`}
      >
        {dragging ? 'agora' : formatElapsed(lead.updatedAt)}
      </time>

      {lead.source && (
        <div className="col-span-2 mt-1.5">
          <SourceTag source={lead.source} />
        </div>
      )}
    </div>
  )
}

/**
 * Card arrastável. Clique ou Enter abre a edição; Espaço pega o card para mover pelo teclado.
 * Com `disabled` (ex.: busca ativa) o card só abre, não arrasta.
 */
export function SortableLeadCard({
  lead,
  closed,
  disabled = false,
  onOpen,
}: {
  lead: Lead
  closed: boolean
  disabled?: boolean
  onOpen: (lead: Lead) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead' },
    disabled,
  })

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault()
      onOpen(lead)
      return
    }
    listeners?.onKeyDown?.(event)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen(lead)}
      aria-roledescription={disabled ? undefined : 'card arrastável'}
      aria-label={disabled ? `${lead.name}. Enter para editar.` : `${lead.name}. Enter para editar, Espaço para mover.`}
      className={`rounded-md transition-colors hover:[&>div]:border-navy-600 ${
        disabled ? 'cursor-pointer' : 'cursor-grab'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <LeadCard lead={lead} closed={closed} />
    </div>
  )
}
