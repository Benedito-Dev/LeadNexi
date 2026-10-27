import { api, corpo } from '@/lib/api'

/** Metas da prospecção (GET/PATCH /results/settings). */
export type Metas = {
  dailyTarget: number
  weeklyTarget: number
  monthlyRevenueGoal: number
  decisionContacts: number
  decisionMinReplies: number
}

/** Textos prontos da cadência. Vazio volta ao texto padrão; marcadores {saudacao}, {loja} e {data}. */
export type TextosProntos = { messageFirst: string; messageFollowUp: string; messageLast: string }

/** Tudo o que Configurações › Prospecção edita (GET/PATCH /results/settings). */
export type Prospeccao = Metas & TextosProntos

export const buscarProspeccao = () => api<Prospeccao>('/results/settings')

export const salvarProspeccao = (valores: Prospeccao) => api<Prospeccao>('/results/settings', { method: 'PATCH', body: corpo(valores) })
