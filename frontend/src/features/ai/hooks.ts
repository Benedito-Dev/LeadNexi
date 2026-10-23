import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leadKeys } from '../leads/hooks.ts'
import {
  createProof,
  deleteProof,
  generateAnalysis,
  generateMessage,
  getAiStatus,
  getProofs,
  sendSuggestionFeedback,
  suggestReply,
  summarizeLead,
  updateProof,
} from './api.ts'
import type { AiChannel, ProofInput } from './types.ts'

const proofKeys = { all: ['proofs'] as const }

/** A IA está configurada no servidor? (muda só com deploy: não precisa reconsultar) */
export function useAiStatus() {
  return useQuery({ queryKey: ['ai', 'status'], queryFn: getAiStatus, staleTime: Infinity })
}

export function useGenerateMessage(leadId: string) {
  return useMutation({
    mutationFn: (input: { channel?: AiChannel; step?: number } = {}) => generateMessage(leadId, input),
  })
}

export function useSuggestReply(leadId: string) {
  return useMutation({
    mutationFn: (input: { channel?: AiChannel; message?: string } = {}) => suggestReply(leadId, input),
  })
}

/** O resumo fica gravado no lead: recarrega o lead para o painel mostrar */
export function useSummarizeLead(leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => summarizeLead(leadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
  })
}

export function useGenerateAnalysis(leadId: string) {
  return useMutation({ mutationFn: () => generateAnalysis(leadId) })
}

/** Opção usada e gostei / não gostei. Falha aqui não atrapalha o usuário: só não registra. */
export function useSuggestionFeedback() {
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; chosenIndex?: number; feedback?: 1 | 0 | -1 }) =>
      sendSuggestionFeedback(id, input),
  })
}

export function useProofs() {
  return useQuery({ queryKey: proofKeys.all, queryFn: getProofs })
}

export function useSaveProof() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<ProofInput> }) =>
      id ? updateProof(id, input) : createProof(input as ProofInput),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: proofKeys.all }),
  })
}

export function useDeleteProof() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProof(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: proofKeys.all }),
  })
}
