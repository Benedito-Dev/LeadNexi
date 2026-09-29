import type { StageOption } from '../leads/components/LeadForm.tsx'
import type { StageInfo } from '../leads/components/LeadsTable.tsx'
import { usePipelines } from './hooks.ts'
import { stageColorClass } from './stageColor.ts'

/**
 * Etapas de todos os funis, prontas para campos e listas: rótulo (com o nome do funil quando há
 * mais de um), cor pela posição no funil e se é a etapa final ("fechado", mesma regra do Kanban).
 */
export function useStageOptions() {
  const pipelines = usePipelines()
  const allPipelines = pipelines.data ?? []
  const multiplePipelines = allPipelines.length > 1

  const stageOptions: StageOption[] = allPipelines.flatMap((pipeline) =>
    pipeline.stages.map((stage, index) => ({
      id: stage.id,
      label: multiplePipelines ? `${pipeline.name} · ${stage.name}` : stage.name,
      colorClass: stageColorClass(index),
    })),
  )
  const byId = new Map(stageOptions.map((option) => [option.id, option]))
  const closedStageIds = new Set(allPipelines.flatMap((pipeline) => pipeline.stages.at(-1)?.id ?? []))

  const stageInfo = (id: string, fallbackName: string): StageInfo => ({
    label: byId.get(id)?.label ?? fallbackName,
    colorClass: byId.get(id)?.colorClass ?? stageColorClass(0),
    closed: closedStageIds.has(id),
  })

  return { stageOptions, stageInfo }
}
