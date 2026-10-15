import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPipeline, deletePipeline, getPipelineBoard, getPipelines, renamePipeline } from './api.ts'

export const pipelineKeys = {
  all: ['pipelines'] as const,
  board: (id: string) => ['pipelines', id, 'board'] as const,
}

export function usePipelines() {
  return useQuery({ queryKey: pipelineKeys.all, queryFn: getPipelines })
}

export function usePipelineBoard(id: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.board(id ?? ''),
    queryFn: () => getPipelineBoard(id!),
    enabled: id !== undefined,
  })
}

// Funis aparecem nas abas do Kanban e nos filtros e campos de etapa: recarrega a lista e os quadros.
function useInvalidatePipelines() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
}

export function useCreatePipeline() {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: ({ name, stageNames }: { name: string; stageNames: string[] }) => createPipeline(name, stageNames),
    onSuccess: invalidate,
  })
}

export function useRenamePipeline() {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renamePipeline(id, name),
    onSuccess: invalidate,
  })
}

export function useDeletePipeline() {
  const invalidate = useInvalidatePipelines()
  return useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: invalidate,
  })
}
