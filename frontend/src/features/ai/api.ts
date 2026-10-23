import { api } from '../../lib/api.ts'
import type { LeadAiSummary } from '../leads/types.ts'
import type {
  AiChannel,
  AiStatus,
  FreeAnalysis,
  MessageSuggestions,
  Proof,
  ProofInput,
  ReplySuggestion,
} from './types.ts'

export function getAiStatus() {
  return api<AiStatus>('/ai/status')
}

export function generateMessage(leadId: string, input: { channel?: AiChannel; step?: number } = {}) {
  return api<MessageSuggestions>(`/leads/${leadId}/ai/message`, { method: 'POST', body: JSON.stringify(input) })
}

export function suggestReply(leadId: string, input: { channel?: AiChannel; message?: string } = {}) {
  return api<ReplySuggestion>(`/leads/${leadId}/ai/reply`, { method: 'POST', body: JSON.stringify(input) })
}

export function summarizeLead(leadId: string) {
  return api<LeadAiSummary & { generatedAt: string }>(`/leads/${leadId}/ai/summary`, { method: 'POST' })
}

export function generateAnalysis(leadId: string) {
  return api<FreeAnalysis>(`/leads/${leadId}/ai/analysis`, { method: 'POST' })
}

export function sendSuggestionFeedback(id: string, input: { chosenIndex?: number; feedback?: 1 | 0 | -1 }) {
  return api<{ id: string; chosenIndex: number | null; feedback: number | null }>(`/ai/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function getProofs() {
  return api<Proof[]>('/proofs')
}

export function createProof(input: ProofInput) {
  return api<Proof>('/proofs', { method: 'POST', body: JSON.stringify(input) })
}

export function updateProof(id: string, input: Partial<ProofInput>) {
  return api<Proof>(`/proofs/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteProof(id: string) {
  return api<void>(`/proofs/${id}`, { method: 'DELETE' })
}
