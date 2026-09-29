import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { formatCurrency } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'
import type { Stage } from '../types.ts'
import { SortableLeadCard } from './LeadCard.tsx'

// Progressão de cor do funil (BRAND.md, seção 4.2): a partir da 4ª etapa fica cyan.
const STAGE_COLOR = ['bg-stage-1', 'bg-stage-2', 'bg-stage-3', 'bg-stage-4']

// Coluna do Kanban (BRAND.md, seção 8): fundo Navy 850 sem borda em repouso; borda Navy 600
// ao receber um card. Cabeçalho com bolinha, nome, contagem, total em R$ e linha da etapa.
export function KanbanColumn({
  stage,
  index,
  leads,
  closed,
  dragDisabled,
  onAddLead,
  onOpenLead,
}: {
  stage: Stage
  index: number
  leads: Lead[]
  closed: boolean
  dragDisabled: boolean
  onAddLead: (stageId: string) => void
  onOpenLead: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'stage' } })
  const color = STAGE_COLOR[Math.min(index, 3)]
  const total = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0)

  return (
    <section
      aria-label={`Etapa ${stage.name}`}
      className={`flex flex-col gap-2 rounded-lg border bg-navy-850 p-2.5 transition-colors ${
        isOver ? 'border-navy-600' : 'border-transparent'
      }`}
    >
      <header className="px-1 pt-0.5 pb-1.5">
        <div className="flex h-8 items-center gap-2">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${color}`} />
          <h2 className="truncate text-ui font-bold text-white">{stage.name}</h2>
          <span className="font-mono text-xs text-slate-400" aria-label={`${leads.length} leads`}>
            {leads.length}
          </span>
          <span className="ml-auto font-mono text-xs text-slate-300" aria-label={`Total ${formatCurrency(total)}`}>
            {formatCurrency(total)}
          </span>
          <button
            type="button"
            onClick={() => onAddLead(stage.id)}
            aria-label={`Novo lead em ${stage.name}`}
            title="Novo lead"
            className="-mr-1 grid size-7 cursor-pointer place-items-center rounded-xs text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
          >
            <Plus aria-hidden size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div aria-hidden className={`mt-2 h-0.5 rounded-full ${color}`} />
      </header>

      <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-col gap-2">
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              closed={closed}
              disabled={dragDisabled}
              onOpen={onOpenLead}
            />
          ))}
          {leads.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-5 text-center text-small font-medium text-slate-400">
              {dragDisabled ? 'Nenhum lead encontrado.' : 'Nenhum lead aqui ainda. Arraste um card ou crie um novo lead.'}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
