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

// Coluna do Kanban (BRAND.md, seção 8): fundo Navy 850 sem borda em repouso, com a altura do
// próprio conteúdo; borda Navy 600 ao receber um card. Cabeçalho: bolinha, nome, contagem e ações (no desktop,
// só aparecem no hover/foco); abaixo, o total da etapa em R$.
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
      className={`group flex min-w-62 flex-1 basis-0 flex-col gap-3 rounded-lg border bg-navy-850 p-2.5 transition-colors ${
        isOver ? 'border-navy-600' : 'border-transparent'
      }`}
    >
      <header className="px-1">
        <div className="flex min-h-8 items-center gap-2">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${color}`} />
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
              <span className="flex-1" />
              <span className="-mr-1 flex shrink-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-aria-expanded:opacity-100 [@media(hover:hover)]:opacity-0">
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
            </>
          )}
        </div>
        <p className="pl-4 text-small text-slate-400 tabular-nums">
          <span className="sr-only">Total: </span>
          {formatCurrency(total)}
        </p>
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
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-small font-medium text-slate-400">
              {dragDisabled ? 'Nenhum lead encontrado.' : 'Arraste um card para cá.'}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
