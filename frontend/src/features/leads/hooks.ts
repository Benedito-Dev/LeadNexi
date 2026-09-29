import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyLeadMove } from '../pipelines/board.ts'
import { pipelineKeys } from '../pipelines/hooks.ts'
import type { PipelineBoard } from '../pipelines/types.ts'
import { createLead, deleteLead, getLeads, moveLead, updateLead } from './api.ts'
import type { CreateLeadInput, LeadInput, LeadListQuery } from './types.ts'

export const leadKeys = {
  all: ['leads'] as const,
  list: (query: LeadListQuery) => ['leads', 'list', query] as const,
}

export function useLeads(query: LeadListQuery) {
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: () => getLeads(query),
    // Ao trocar de página ou filtro, mantém a lista anterior até a nova chegar (sem piscar)
    placeholderData: keepPreviousData,
  })
}

// Lead mudou: recarrega os quadros (Kanban) e as listas (tela de Leads).
function useInvalidateLeads() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
      queryClient.invalidateQueries({ queryKey: leadKeys.all }),
    ])
}

export function useCreateLead() {
  const invalidate = useInvalidateLeads()
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    onSuccess: invalidate,
  })
}

export function useUpdateLead() {
  const invalidate = useInvalidateLeads()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadInput }) => updateLead(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLead() {
  const invalidate = useInvalidateLeads()
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
  const invalidate = useInvalidateLeads()
  const key = pipelineKeys.board(pipelineId)

  const mutation = useMutation({
    mutationFn: ({ leadId, stageId, position }: { leadId: string; stageId: string; position: number }) =>
      moveLead(leadId, { stageId, position }),
    onSettled: invalidate,
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
