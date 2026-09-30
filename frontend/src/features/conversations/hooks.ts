import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { leadKeys } from '../leads/hooks.ts'
import { getConversation, sendMessage } from './api.ts'

export const conversationKeys = {
  detail: (leadId: string) => ['conversations', leadId] as const,
}

/** Conversa aberta: confere mensagens novas a cada 10 s. */
export function useConversation(leadId: string) {
  return useQuery({
    queryKey: conversationKeys.detail(leadId),
    queryFn: () => getConversation(leadId),
    refetchInterval: 10_000,
  })
}

/** Enviou (ou falhou por janela fechada): recarrega a conversa e o histórico do lead. */
export function useSendMessage(leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => sendMessage(leadId, text),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(leadId) }),
        queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) }),
      ]),
  })
}

/** Hora atual, atualizada a cada minuto (contagem da janela de 24 h). */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
