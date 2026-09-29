import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeyboardEvent } from 'react'
import { formatCurrency, formatElapsed } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'

// Card de lead (BRAND.md, seção 8): três linhas lidas de cima para baixo. Nome, valor (se
// houver) e uma linha discreta com origem e tempo. "closed" = etapa final: valor em cyan.
export function LeadCard({ lead, closed, dragging = false }: { lead: Lead; closed: boolean; dragging?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border px-3.5 py-3 transition-colors ${
        dragging ? '-rotate-[1.5deg] border-cyan bg-navy-drag shadow-drag' : 'bg-navy-800'
      }`}
    >
      <p className="line-clamp-2 text-ui font-bold text-white">{lead.name}</p>
      {lead.estimatedValue && (
        <p className={`text-ui tabular-nums ${closed ? 'text-cyan' : 'text-slate-300'}`}>
          {formatCurrency(lead.estimatedValue)}
        </p>
      )}
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-400">
        {lead.source && <>{lead.source} · </>}
        <time dateTime={lead.updatedAt} title="Última movimentação" className={dragging ? 'text-cyan' : undefined}>
          {dragging ? 'agora' : formatElapsed(lead.updatedAt)}
        </time>
      </p>
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
