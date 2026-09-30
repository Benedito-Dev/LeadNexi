import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyLeadMove } from '../pipelines/board.ts'
import { pipelineKeys } from '../pipelines/hooks.ts'
import type { PipelineBoard } from '../pipelines/types.ts'
import {
  addLeadNote,
  cancelFollowUp,
  completeFollowUp,
  createLead,
  deleteLead,
  getLead,
  getFollowUps,
  getLeadActivities,
  getLeads,
  importLeads,
  moveLead,
  removeLeadNote,
  scheduleFollowUp,
  updateLead,
} from './api.ts'
import type { ImportLeadRow } from './api.ts'
import type { CreateLeadInput, Lead, LeadInput, LeadListQuery } from './types.ts'

export const leadKeys = {
  all: ['leads'] as const,
  list: (query: LeadListQuery) => ['leads', 'list', query] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
  activities: (id: string) => ['leads', 'activities', id] as const,
  followUps: ['leads', 'follow-ups'] as const,
}

/** Lead atualizado do servidor; `initial` (ex.: o card clicado) aparece na hora, sem esperar. */
export function useLead(id: string, initial?: Lead) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    // O card do Kanban não traz o resumo da etapa: aqui só se usa o que é comum a Lead
    queryFn: (): Promise<Lead> => getLead(id),
    initialData: initial,
    // O card pode estar desatualizado: busca de novo mesmo com o dado inicial
    initialDataUpdatedAt: 0,
  })
}

/** Agenda de contatos (tela "Hoje" e contador do menu). Atualiza sozinha a cada minuto. */
export function useFollowUps() {
  return useQuery({ queryKey: leadKeys.followUps, queryFn: getFollowUps, refetchInterval: 60_000 })
}

export function useLeadActivities(id: string) {
  return useQuery({ queryKey: leadKeys.activities(id), queryFn: () => getLeadActivities(id) })
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

/** Importação de planilha: conferir (dryRun) não muda nada; importar recarrega funil e listas. */
export function useImportLeads() {
  const invalidate = useInvalidateLeads()
  return useMutation({
    mutationFn: ({ leads, dryRun }: { leads: ImportLeadRow[]; dryRun: boolean }) => importLeads(leads, dryRun),
    onSuccess: (_result, { dryRun }) => (dryRun ? undefined : invalidate()),
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

// Histórico e próximo contato: qualquer mudança recarrega lead, histórico, quadros e listas
// (todas as chaves de lead começam com 'leads').

export function useAddLeadNote(id: string) {
  const invalidate = useInvalidateLeads()
  return useMutation({ mutationFn: (text: string) => addLeadNote(id, text), onSuccess: invalidate })
}

export function useRemoveLeadNote(id: string) {
  const invalidate = useInvalidateLeads()
  return useMutation({ mutationFn: (activityId: string) => removeLeadNote(id, activityId), onSuccess: invalidate })
}

export function useScheduleFollowUp(id: string) {
  const invalidate = useInvalidateLeads()
  return useMutation({
    mutationFn: (input: { dueAt: string; note?: string }) => scheduleFollowUp(id, input),
    onSuccess: invalidate,
  })
}

export function useCompleteFollowUp(id: string) {
  const invalidate = useInvalidateLeads()
  return useMutation({ mutationFn: () => completeFollowUp(id), onSuccess: invalidate })
}

export function useCancelFollowUp(id: string) {
  const invalidate = useInvalidateLeads()
  return useMutation({ mutationFn: () => cancelFollowUp(id), onSuccess: invalidate })
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
