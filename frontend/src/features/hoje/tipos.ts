import type { Lead, StageType } from '../crm/types'

/** Lead como o painel de hoje devolve: com a etapa e os dados de prospecção. */
export type LeadDoPainel = Lead & {
  stage: { id: string; name: string; pipelineId: string; stageType: StageType }
  updatedAt: string
  cadenceStep: number | null
  meetingAt: string | null
  neighborhood: string | null
  googleRating: number | null
  googleReviewCount: number | null
  adStatus: string | null
  phoneType: string | null
  isNetwork: boolean
  instagramUserId: string | null
}

/** Textos da cadência (Configurações › Prospecção), com os marcadores {saudacao}, {loja} e {data}. */
export type TextosDaCadencia = { messageFirst: string; messageFollowUp: string; messageLast: string }

/** Resposta de `GET /leads/today`. */
export type PainelDeHoje = {
  dailyTarget: number
  weeklyTarget: number
  monthlyGoal: number
  messageTemplates: TextosDaCadencia
  /** Mensagens enviadas e contatos marcados como feitos hoje (horário de Fortaleza). */
  actionsDoneToday: number
  /** 1ªs mensagens por dia, de segunda a domingo da semana atual. */
  week: { date: string; firstContacts: number }[]
  /** 1ªs mensagens por dia, do dia 1 do mês até hoje. */
  month: { date: string; firstContacts: number }[]
  /** Dias seguidos batendo a meta diária. */
  streakDays: number
  followUps: LeadDoPainel[]
  responses: LeadDoPainel[]
  newContacts: LeadDoPainel[]
  meetings: LeadDoPainel[]
  contactsMade: number
  responsesThisWeek: number
  closedThisMonth: { count: number; value: number | string }
}
