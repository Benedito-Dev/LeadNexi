import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronDown, Flame, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatCurrency } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'
import { StageActions } from '../../stages/components/StageActions.tsx'
import { StageNameForm } from '../../stages/components/StageNameForm.tsx'
import { useRenameStage } from '../../stages/hooks.ts'
import { EMPTY_STAGE_COPY, HOT_STAGES } from '../nextAction.ts'
import { stageColorClass } from '../stageColor.ts'
import type { Stage } from '../types.ts'
import { SortableLeadCard } from './LeadCard.tsx'

// Coluna do Kanban (BRAND.md, seção 8): fundo Navy 850 sem borda em repouso, todas com a mesma
// altura (até o fim da tela); borda Navy 600 ao receber um card. Faixa de 2px na cor da etapa no
// topo. Cabeçalho numa linha: nome, contagem, total em R$ (só quando há valor) e ações (no desktop, só
// no hover/foco).
// Temperatura: etapas quentes (respondeu, reunião, proposta) com leads ganham brilho cyan no topo e a
// etiqueta "Quente". A primeira etapa ("A contatar") é uma FILA: mostra as próximas lojas, esconde o
// resto atrás de "Mostrar mais" e tem o botão "Começar", que abre o modo prospecção na tela Hoje.
const QUEUE_PREVIEW = 5

export function KanbanColumn({
  stage,
  index,
  stageCount,
  stageLeadCount,
  leads,
  dragDisabled,
  landedId,
  fullWidth = false,
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
  dragDisabled: boolean
  /** Card que acabou de avançar de etapa (brilha uma vez) */
  landedId?: string | null
  /** No celular a coluna ocupa a tela toda (uma etapa por vez, escolhida nas abas) */
  fullWidth?: boolean
  onAddLead: (stageId: string) => void
  onOpenLead: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'stage' } })
  const color = stageColorClass(index)
  const total = leads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0)
  const [renaming, setRenaming] = useState(false)
  const rename = useRenameStage()
  const [expanded, setExpanded] = useState(false)
  const hot = HOT_STAGES.includes(stage.stageType) && leads.length > 0
  const isQueue = stage.stageType === 'CONTACT'
  // Busca ativa mostra tudo (é filtro); a fila só encolhe quando passa da prévia
  const collapsed = isQueue && !expanded && !dragDisabled && leads.length > QUEUE_PREVIEW + 1
  const shown = collapsed ? leads.slice(0, QUEUE_PREVIEW) : leads

  return (
    <section
      aria-label={`Etapa ${stage.name}`}
      className={`group relative flex min-h-80 flex-col gap-2.5 rounded-lg border bg-navy-850 p-2.5 pt-3 transition-colors ${
        fullWidth ? 'w-full' : 'min-w-62 flex-1 basis-0 lg:min-h-[calc(100dvh-14rem)]'
      } ${isOver ? 'border-navy-600' : hot ? 'border-cyan/20' : 'border-transparent'}`}
    >
      {hot && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-lg bg-linear-to-b from-cyan/12 to-transparent"
        />
      )}
      <span aria-hidden className={`absolute inset-x-4 top-0 h-0.5 rounded-b-full ${color} ${hot ? 'shadow-[0_0_12px_var(--lnx-cyan)]' : ''}`} />
      <header className="relative px-1.5">
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
              {hot && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-tint px-2 py-0.5 text-[10px] leading-none font-bold text-cyan">
                  <Flame aria-hidden size={11} strokeWidth={1.75} />
                  Quente
                </span>
              )}
              {/* No desktop as ações aparecem por cima do total (hover/foco); em toque ficam ao lado */}
              <span className="relative ml-auto flex shrink-0 items-center gap-1">
                {total > 0 && (
                  <span
                    className={`text-small tabular-nums transition-opacity [@media(hover:hover)]:group-focus-within:opacity-0 [@media(hover:hover)]:group-hover:opacity-0 [@media(hover:hover)]:group-has-aria-expanded:opacity-0 ${
                      stage.stageType === 'WON' ? 'font-bold text-success' : 'text-slate-400'
                    }`}
                  >
                    <span className="sr-only">Total: </span>
                    {formatCurrency(total)}
                  </span>
                )}
                <span className="-mr-1 flex shrink-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-aria-expanded:opacity-100 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-0 [@media(hover:hover)]:opacity-0">
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

      {isQueue && leads.length > 0 && !dragDisabled && (
        <div className="relative flex items-center justify-between gap-3 rounded-md border border-violet-600/40 bg-violet-tint/60 px-3 py-2.5">
          <span className="min-w-0 text-small font-bold text-white">
            <span className="tabular-nums">{leads.length}</span> na fila
          </span>
          <Link
            to="/hoje?prospectar=1"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-violet-600 px-3 text-small font-bold text-on-accent"
          >
            <Play aria-hidden size={14} strokeWidth={1.75} />
            Começar
          </Link>
        </div>
      )}

      <SortableContext items={shown.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="relative flex min-h-24 flex-1 flex-col gap-2">
          {shown.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              stageType={stage.stageType}
              disabled={dragDisabled}
              landed={lead.id === landedId}
              onOpen={onOpenLead}
            />
          ))}
          {collapsed && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed text-small font-bold text-slate-300 transition-colors hover:border-navy-600 hover:text-white"
            >
              Mostrar mais {leads.length - QUEUE_PREVIEW}
              <ChevronDown aria-hidden size={15} strokeWidth={1.75} />
            </button>
          )}
          {leads.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-small font-medium text-slate-400">
              {dragDisabled ? 'Nenhum lead encontrado.' : EMPTY_STAGE_COPY[stage.stageType]}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
