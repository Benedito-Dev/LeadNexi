import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addClientPayment,
  deleteClientPayment,
  deleteClientReport,
  getClientReminders,
  getClients,
  saveClientReport,
  updateClient,
} from './api.ts'
import type { Client, UpdateClientInput } from './types.ts'

export const clientKeys = {
  all: ['clients'] as const,
  list: ['clients', 'list'] as const,
  reminders: ['clients', 'reminders'] as const,
}

export function useClients() {
  return useQuery({ queryKey: clientKeys.list, queryFn: getClients })
}

/** Lembretes da tela Hoje (renovação e relatório pendente) */
export function useClientReminders() {
  return useQuery({ queryKey: clientKeys.reminders, queryFn: getClientReminders, refetchInterval: 5 * 60_000 })
}

/** Toda mudança devolve a ficha atualizada: grava na lista e recarrega os lembretes. */
function useClientMutation<Input>(mutationFn: (input: Input) => Promise<Client>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (client) => {
      queryClient.setQueryData<Client[]>(clientKeys.list, (list) => list?.map((item) => (item.id === client.id ? client : item)))
      return queryClient.invalidateQueries({ queryKey: clientKeys.reminders })
    },
  })
}

export function useUpdateClient(id: string) {
  return useClientMutation((input: UpdateClientInput) => updateClient(id, input))
}

export function useSaveClientReport(id: string) {
  return useClientMutation((input: { weekStart: string; spend: number; conversations: number; notes?: string }) =>
    saveClientReport(id, input),
  )
}

export function useDeleteClientReport(id: string) {
  return useClientMutation((reportId: string) => deleteClientReport(id, reportId))
}

export function useAddClientPayment(id: string) {
  return useClientMutation((input: { amount: number; period: string; note?: string }) => addClientPayment(id, input))
}

export function useDeleteClientPayment(id: string) {
  return useClientMutation((paymentId: string) => deleteClientPayment(id, paymentId))
}
