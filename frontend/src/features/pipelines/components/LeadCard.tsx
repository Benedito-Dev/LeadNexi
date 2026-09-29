import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { formatCurrency, formatElapsed } from '../../../lib/format.ts'
import { SourceIcon } from '../../leads/components/SourceIcon.tsx'
import type { Lead } from '../../leads/types.ts'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

// Card de lead (BRAND.md, seção 8): corpo com iniciais, nome e origem (com ícone do canal); rodapé separado por
// divisória com o valor (verde na etapa final) e o tempo desde a última movimentação.
export function LeadCard({ lead, closed, dragging = false }: { lead: Lead; closed: boolean; dragging?: boolean }) {
  return (
    <div
      className={`rounded-md border transition-colors ${
        dragging ? '-rotate-[1.5deg] border-cyan bg-navy-drag shadow-drag' : 'bg-navy-800'
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-3">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-tint text-xs font-extrabold text-slate-300"
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-ui font-bold text-white">{lead.name}</p>
          {lead.source && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <SourceIcon source={lead.source} />
              <span className="truncate">{lead.source}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-3.5 py-2.5">
        {lead.estimatedValue ? (
          <span className={`text-ui font-bold ${closed ? 'text-success' : 'text-white'}`}>
            {formatCurrency(lead.estimatedValue)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">Sem valor</span>
        )}
        <time
          dateTime={lead.updatedAt}
          title="Última movimentação"
          className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${dragging ? 'text-cyan' : 'text-slate-400'}`}
        >
          <Clock aria-hidden size={13} strokeWidth={1.75} />
          {dragging ? 'agora' : formatElapsed(lead.updatedAt)}
        </time>
      </div>
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
