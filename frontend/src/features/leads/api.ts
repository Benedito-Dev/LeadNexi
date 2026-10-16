import { api } from '../../lib/api.ts'
import type {
  CreateLeadInput,
  Lead,
  LeadActivity,
  LeadInput,
  LeadList,
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

export function getLeadLists() {
  return api<LeadList[]>('/lead-lists')
}

export function createLeadList(input: { name: string; niche?: string; city?: string; targetContacts?: number }) {
  return api<LeadList>('/lead-lists', { method: 'POST', body: JSON.stringify(input) })
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

export function getFollowUps() {
  return api<LeadWithStage[]>('/leads/follow-ups')
}

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

export function recordWhatsAppSent(id: string, message: string) {
  return api<LeadWithStage>(`/leads/${id}/whatsapp/sent`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function recordWhatsAppResponse(id: string, text?: string) {
  return api<LeadWithStage>(`/leads/${id}/whatsapp/responded`, {
    method: 'POST',
    body: JSON.stringify(text?.trim() ? { text: text.trim() } : {}),
  })
}

export interface ImportLeadRow {
  name: string
  phone?: string
  phoneType?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  notes?: string
  listId?: string
  neighborhood?: string
  address?: string
  mapsUrl?: string
  googlePlaceId?: string
  googleRating?: number
  googleReviewCount?: number
  isNetwork?: boolean
  adStatus?: string
  cadenceStep?: number
  followUpAt?: string
  stageId: string
}

export interface ImportLeadsResult {
  accepted: number
  skipped: number
  rows: { index: number; status: 'ready' | 'created' | 'updated' | 'duplicate' | 'invalid'; reason?: string }[]
}

export function importLeads(
  leads: ImportLeadRow[],
  options: { dryRun?: boolean; listId?: string; duplicateMode?: 'skip' | 'update' | 'duplicate' } = {},
) {
  return api<ImportLeadsResult>('/leads/import', {
    method: 'POST',
    body: JSON.stringify({
      leads,
      ...(options.dryRun ? { dryRun: true } : {}),
      ...(options.listId ? { listId: options.listId } : {}),
      ...(options.duplicateMode && options.duplicateMode !== 'skip' ? { duplicateMode: options.duplicateMode } : {}),
    }),
  })
}
