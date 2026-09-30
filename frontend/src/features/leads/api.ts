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

/** Leads com próximo contato agendado, atrasados primeiro (tela "Hoje") */
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

/** Linha da planilha já ligada aos campos do lead (POST /leads/import) */
export interface ImportLeadRow {
  name: string
  phone?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  notes?: string
  stageId: string
}

export interface ImportLeadsResult {
  /** Entram (dryRun) ou entraram */
  accepted: number
  skipped: number
  rows: { index: number; status: 'ready' | 'created' | 'duplicate' | 'invalid'; reason?: string }[]
}

/** Importa leads de planilha; `dryRun` só confere (quem entra, quem já existe, quem tem problema) */
export function importLeads(leads: ImportLeadRow[], dryRun = false) {
  return api<ImportLeadsResult>('/leads/import', {
    method: 'POST',
    body: JSON.stringify({ leads, ...(dryRun ? { dryRun } : {}) }),
  })
}
