import { api } from '../../lib/api.ts'
import type { LeadActivity } from '../leads/types.ts'
import type { Conversation } from './types.ts'

export function getConversation(leadId: string) {
  return api<Conversation>(`/leads/${leadId}/instagram/conversation`)
}

/** Manda um texto no direct; a resposta é o item novo do histórico do lead */
export function sendMessage(leadId: string, text: string) {
  return api<LeadActivity>(`/leads/${leadId}/instagram/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}
