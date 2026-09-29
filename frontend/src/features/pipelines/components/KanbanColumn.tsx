import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'
import { StageActions } from '../../stages/components/StageActions.tsx'
import { StageNameForm } from '../../stages/components/StageNameForm.tsx'
import { useRenameStage } from '../../stages/hooks.ts'
import { stageColorClass } from '../stageColor.ts'
import type { Stage } from '../types.ts'
import { SortableLeadCard } from './LeadCard.tsx'

// Coluna do Kanban (BRAND.md, seção 8): fundo Navy 850 sem borda em repouso, todas com a mesma
// altura (até o fim da tela); borda Navy 600 ao receber um card. Faixa de 2px na cor da etapa no
// topo. Cabeçalho numa linha: nome, contagem, total em R$ e ações (no desktop, só no hover/foco).
export function KanbanColumn({
  stage,
  index,
  stageCount,
  stageLeadCount,
  leads,
  closed,
  dragDisabled,
  onAddLead,
  onOpenLead,
}: {
  stage: Stage
  index: number
  stageCount: number
  /** Total real de leads na etapa (sem o filtro da busca): decide se ela pode ser excluída */
  stageLeadCount: number
  /** Leads exibidos (podem estar filtrados pela busca) */
  leads: Lead[]
  closed: boolean
  dragDisabled: boolean
  onAddLead: (stageId: string) => void
  onOpenLead: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'stage' } })
  const color = stageColorClass(index)
  const total = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0)
  const [renaming, setRenaming] = useState(false)
  const rename = useRenameStage()

  return (
    <section
      aria-label={`Etapa ${stage.name}`}
      className={`group relative flex min-h-80 min-w-62 flex-1 basis-0 flex-col gap-2.5 rounded-lg border bg-navy-850 p-2.5 pt-3 transition-colors lg:min-h-[calc(100dvh-16rem)] ${
        isOver ? 'border-navy-600' : 'border-transparent'
      }`}
    >
      <span aria-hidden className={`absolute inset-x-4 top-0 h-0.5 rounded-b-full ${color}`} />
      <header className="px-1.5">
        <div className="flex min-h-8 items-center gap-2">
          {renaming ? (
            <StageNameForm
              initialName={stage.name}
              label={`Novo nome da etapa ${stage.name}`}
              saving={rename.isPending}
              error={rename.error}
              onSubmit={(name) =>
                rename.mutate(
                  { id: stage.id, name },
                  {
                    onSuccess: () => {
                      rename.reset()
                      setRenaming(false)
                    },
                  },
                )
              }
              onCancel={() => {
                rename.reset()
                setRenaming(false)
              }}
            />
          ) : (
            <>
              <h2
                className="min-w-0 truncate text-ui font-bold text-white"
                title={stage.name}
                onDoubleClick={() => setRenaming(true)}
              >
                {stage.name}
              </h2>
              <span className="text-small text-slate-400 tabular-nums">
                <span className="sr-only">Leads: </span>
                {leads.length}
              </span>
              {/* No desktop as ações aparecem por cima do total (hover/foco); em toque ficam ao lado */}
              <span className="relative ml-auto flex shrink-0 items-center gap-1">
                <span className="text-small text-slate-400 tabular-nums transition-opacity [@media(hover:hover)]:group-focus-within:opacity-0 [@media(hover:hover)]:group-hover:opacity-0 [@media(hover:hover)]:group-has-aria-expanded:opacity-0">
                  <span className="sr-only">Total: </span>
                  {formatCurrency(total)}
                </span>
                <span className="-mr-1 flex shrink-0 bg-navy-850 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-aria-expanded:opacity-100 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-0 [@media(hover:hover)]:opacity-0">
                  <button
                    type="button"
                    onClick={() => onAddLead(stage.id)}
                    aria-label={`Novo lead em ${stage.name}`}
                    title="Novo lead"
                    className="grid size-7 cursor-pointer place-items-center rounded-xs text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
                  >
                    <Plus aria-hidden size={16} strokeWidth={1.75} />
                  </button>
                  <StageActions
                    stage={stage}
                    index={index}
                    stageCount={stageCount}
                    leadCount={stageLeadCount}
                    onRename={() => setRenaming(true)}
                  />
                </span>
              </span>
            </>
          )}
        </div>
      </header>

      <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
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
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-small font-medium text-slate-400">
              {dragDisabled ? 'Nenhum lead encontrado.' : 'Arraste um card para cá.'}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
