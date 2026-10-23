import { api } from '../../lib/api.ts'
import type { Client, ClientReminders, UpdateClientInput } from './types.ts'

export function getClients() {
  return api<Client[]>('/clients')
}

export function getClientReminders() {
  return api<ClientReminders>('/clients/reminders')
}

export function updateClient(id: string, input: UpdateClientInput) {
  return api<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function saveClientReport(id: string, input: { weekStart: string; spend: number; conversations: number; notes?: string }) {
  return api<Client>(`/clients/${id}/reports`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteClientReport(id: string, reportId: string) {
  return api<Client>(`/clients/${id}/reports/${reportId}`, { method: 'DELETE' })
}

export function addClientPayment(id: string, input: { amount: number; period: string; paidAt?: string; note?: string }) {
  return api<Client>(`/clients/${id}/payments`, { method: 'POST', body: JSON.stringify(input) })
}

export function deleteClientPayment(id: string, paymentId: string) {
  return api<Client>(`/clients/${id}/payments/${paymentId}`, { method: 'DELETE' })
}
