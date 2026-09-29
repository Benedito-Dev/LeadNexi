import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyLeadMove } from '../pipelines/board.ts'
import { pipelineKeys } from '../pipelines/hooks.ts'
import type { PipelineBoard } from '../pipelines/types.ts'
import { createLead, deleteLead, moveLead, updateLead } from './api.ts'
import type { CreateLeadInput, LeadInput } from './types.ts'

// Qualquer mudança em lead afeta o quadro do pipeline: recarrega do servidor.
function useInvalidateBoard(pipelineId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: pipelineKeys.board(pipelineId) })
}

export function useCreateLead(pipelineId: string) {
  const invalidate = useInvalidateBoard(pipelineId)
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    onSuccess: invalidate,
  })
}

export function useUpdateLead(pipelineId: string) {
  const invalidate = useInvalidateBoard(pipelineId)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadInput }) => updateLead(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLead(pipelineId: string) {
  const invalidate = useInvalidateBoard(pipelineId)
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: invalidate,
  })
}

/**
 * Move o card de forma otimista: o quadro muda na hora e o servidor confirma depois.
 * Se a API falhar, o quadro é recarregado e volta ao estado real.
 */
export function useMoveLead(pipelineId: string) {
  const queryClient = useQueryClient()
  const key = pipelineKeys.board(pipelineId)

  const mutation = useMutation({
    mutationFn: ({ leadId, stageId, position }: { leadId: string; stageId: string; position: number }) =>
      moveLead(leadId, { stageId, position }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  function move(leadId: string, stageId: string, position: number) {
    // Síncrono, antes da requisição: o card não "pisca" de volta ao soltar
    void queryClient.cancelQueries({ queryKey: key })
    queryClient.setQueryData<PipelineBoard>(key, (board) =>
      board ? applyLeadMove(board, leadId, stageId, position) : board,
    )
    mutation.mutate({ leadId, stageId, position })
  }

  return { move, error: mutation.error, reset: mutation.reset }
}
