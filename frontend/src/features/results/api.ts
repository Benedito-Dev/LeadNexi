import { api } from '../../lib/api.ts'
import type { ProspectingSettings, ResultsDashboard } from './types.ts'

export function getResultsDashboard() {
  return api<ResultsDashboard>('/results')
}

export function updateProspectingSettings(input: Omit<ProspectingSettings, 'id'>) {
  return api<ProspectingSettings>('/results/settings', { method: 'PATCH', body: JSON.stringify(input) })
}
