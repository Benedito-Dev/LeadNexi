import { api } from '../../lib/api.ts'
import type {
  CreateLeadInput,
  Lead,
  LeadActivity,
  LeadInput,
  LeadListQuery,
  LeadWithStage,
  MoveLeadInput,
  Paginated,
} from './types.ts'

export function getLeads(query: LeadListQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return api<Paginated<LeadWithStage>>(`/leads?${params}`)
}

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

export function getLead(id: string) {
  return api<LeadWithStage>(`/leads/${id}`)
}

// Histórico e próximo contato

export function getLeadActivities(id: string) {
  return api<LeadActivity[]>(`/leads/${id}/activities`)
}

export function addLeadNote(id: string, text: string) {
  return api<LeadActivity>(`/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) })
}

export function removeLeadNote(id: string, activityId: string) {
  return api<void>(`/leads/${id}/notes/${activityId}`, { method: 'DELETE' })
}

export function scheduleFollowUp(id: string, input: { dueAt: string; note?: string }) {
  return api<LeadWithStage>(`/leads/${id}/follow-up`, { method: 'PUT', body: JSON.stringify(input) })
}

export function completeFollowUp(id: string) {
  return api<LeadWithStage>(`/leads/${id}/follow-up/complete`, { method: 'POST' })
}

export function cancelFollowUp(id: string) {
  return api<LeadWithStage>(`/leads/${id}/follow-up`, { method: 'DELETE' })
}
