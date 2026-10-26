import type { Metas } from '../configuracoes/api'

export type Etapa = { count: number; rate: number | null }

/** Funil de um período: leads contatados no período e até onde chegaram. */
export type Funil = {
  contacted: Etapa
  responded: Etapa
  meeting: Etapa
  proposal: Etapa
  won: Etapa
  /** Soma do valor dos leads fechados no período. */
  revenue: number
}

export type DesempenhoDaMensagem = { templateId: string; variation: string; contacts: number; responses: number; responseRate: number | null }

/** GET /results */
export type Placar = {
  settings: Metas
  weekly: Funil
  monthly: Funil
  streakDays: number
  averageFirstResponseHours: number | null
  messagePerformance: Record<'week' | 'month', DesempenhoDaMensagem[]>
  /** Lista que bateu a regra de troca (muitos contatos, poucas respostas). */
  decisionAlert: { name: string; contacts: number; replies: number; threshold: number; minimumReplies: number } | null
}
