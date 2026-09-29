import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineKeys } from '../pipelines/hooks.ts'
import type { PipelineBoard } from '../pipelines/types.ts'
import { createStage, deleteStage, renameStage, reorderStages } from './api.ts'

// Etapas aparecem no quadro e na lista de pipelines (filtros da tela de Leads): recarrega os dois.
function useInvalidatePipelines() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
}

export function useCreateStage(pipelineId: string) {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: (name: string) => createStage(pipelineId, name),
    onSuccess: invalidate,
  })
}

export function useRenameStage() {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameStage(id, name),
    onSuccess: invalidate,
  })
}

export function useDeleteStage() {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: (id: string) => deleteStage(id),
    onSuccess: invalidate,
  })
}

/** Move a etapa uma casa para a esquerda (-1) ou direita (+1), de forma otimista. */
export function useMoveStage(pipelineId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidatePipelines()
  const key = pipelineKeys.board(pipelineId)

  const mutation = useMutation({
    mutationFn: (stageIds: string[]) => reorderStages(pipelineId, stageIds),
    onSettled: invalidate,
  })

  return (stageId: string, direction: -1 | 1) => {
    const board = queryClient.getQueryData<PipelineBoard>(key)
    if (!board) return
    const from = board.stages.findIndex((stage) => stage.id === stageId)
    const to = from + direction
    if (from < 0 || to < 0 || to >= board.stages.length) return

    const stages = [...board.stages]
    const [moved] = stages.splice(from, 1)
    stages.splice(to, 0, moved!)
    void queryClient.cancelQueries({ queryKey: key })
    queryClient.setQueryData<PipelineBoard>(key, {
      ...board,
      stages: stages.map((stage, position) => ({ ...stage, position })),
    })
    mutation.mutate(stages.map((stage) => stage.id))
  }
}
