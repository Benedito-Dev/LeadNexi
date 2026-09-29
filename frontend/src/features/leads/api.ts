import { api } from '../../lib/api.ts'
import type { CreateLeadInput, Lead, LeadInput, MoveLeadInput } from './types.ts'

export function createLead(input: CreateLeadInput) {
  return api<Lead>('/leads', { method: 'POST', body: JSON.stringify(input) })
}

export function updateLead(id: string, input: LeadInput) {
  return api<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function moveLead(id: string, input: MoveLeadInput) {
  return api<Lead>(`/leads/${id}/move`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteLead(id: string) {
  return api<void>(`/leads/${id}`, { method: 'DELETE' })
}
