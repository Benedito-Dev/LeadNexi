import { useQuery } from '@tanstack/react-query'
import { getPipelineBoard, getPipelines } from './api.ts'

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
