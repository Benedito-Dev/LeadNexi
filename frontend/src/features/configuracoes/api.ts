import { api, corpo } from '@/lib/api'

/** Metas da prospecção (GET/PATCH /results/settings). */
export type Metas = {
  dailyTarget: number
  weeklyTarget: number
  monthlyRevenueGoal: number
  decisionContacts: number
  decisionMinReplies: number
}

export const buscarMetas = () => api<Metas>('/results/settings')

export const salvarMetas = (metas: Metas) => api<Metas>('/results/settings', { method: 'PATCH', body: corpo(metas) })
