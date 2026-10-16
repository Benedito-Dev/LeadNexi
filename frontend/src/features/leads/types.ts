import type { Stage } from '../pipelines/types.ts'

export interface Lead {
  id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  listId: string
  list: { id: string; name: string; archived: boolean }
  archived: boolean
  phoneType: string | null
  neighborhood: string | null
  address: string | null
  mapsUrl: string | null
  googlePlaceId: string | null
  googleRating: number | null
  googleReviewCount: number | null
  isNetwork: boolean
  adStatus: string | null
  cadenceStep: number | null
  meetingAt: string | null
  lostReason: string | null
  wonAt: string | null
  /** Decimal serializado como string pela API (ex.: "1500.5") */
  estimatedValue: string | null
  notes: string | null
  position: number
  stageId: string
  /** Próximo contato agendado (ISO); null = nenhum */
  followUpAt: string | null
  /** O que fazer no próximo contato */
  followUpNote: string | null
  /** @ do Instagram (sem o @) */
  instagramUsername: string | null
  /** Quem mandou direct (ID no Instagram); null = nunca mandou (não dá para responder pelo LeadNexi) */
  instagramUserId: string | null
  /** Última mensagem do lead no direct (ISO): dá para responder até 24 h depois */
  instagramLastMessageAt: string | null
  /** Foto de perfil guardada (GET /api/leads/avatars/:id); null = iniciais */
  avatarId: string | null
  createdAt: string
  updatedAt: string
}

export type LeadActivityType =
  | 'CREATED'
  | 'STAGE_CHANGED'
  | 'NOTE'
  | 'FOLLOW_UP_SCHEDULED'
  | 'FOLLOW_UP_DONE'
  /** Mensagem recebida no direct do Instagram */
  | 'INSTAGRAM_MESSAGE'
  /** Mensagem enviada ao lead no direct (pelo app do Instagram ou pelo LeadNexi) */
  | 'INSTAGRAM_MESSAGE_SENT'

/** Item do histórico do lead (GET /leads/:id/activities, mais novo primeiro) */
export interface LeadActivity {
  id: string
  leadId: string
  type: LeadActivityType
  /** Texto da nota, origem (na criação), descrição do follow-up ou mensagem do direct */
  text: string | null
  /** Nomes das etapas no momento da mudança */
  fromStage: string | null
  toStage: string | null
  /** Data do follow-up agendado/concluído (ISO) */
  dueAt: string | null
  createdAt: string
}

/**
 * Campos editáveis do lead (a etapa só muda via movimentação no Kanban).
 * `null` limpa o campo no servidor; `undefined` não altera.
 */
export interface LeadInput {
  name: string
  phone?: string | null
  email?: string | null
  source?: string | null
  /** @ do Instagram (com ou sem o @) */
  instagramUsername?: string | null
  estimatedValue?: number | null
  notes?: string | null
  listId?: string
  archived?: boolean
  phoneType?: string | null
  neighborhood?: string | null
  address?: string | null
  mapsUrl?: string | null
  googlePlaceId?: string | null
  googleRating?: number | null
  googleReviewCount?: number | null
  isNetwork?: boolean
  adStatus?: string | null
  cadenceStep?: number | null
  followUpAt?: string | null
  meetingAt?: string | null
  lostReason?: string | null
}

export interface CreateLeadInput extends LeadInput {
  stageId: string
}

export interface MoveLeadInput {
  stageId: string
  /** Posição de destino na coluna (0 = topo) */
  position: number
  lostReason?: string
}

/** Lead como vem de GET /leads e GET /leads/:id: com o resumo da etapa */
export interface LeadWithStage extends Lead {
  stage: { id: string; name: string; pipelineId: string; stageType: Stage['stageType'] }
}

/** Filtros de GET /leads */
export interface LeadListQuery {
  search?: string
  stageId?: string
  source?: string
  listId?: string
  includeArchived?: boolean
  archived?: boolean
  page: number
  limit: number
}

export interface LeadList {
  id: string
  name: string
  niche: string | null
  city: string | null
  targetContacts: number | null
  archived: boolean
  leadCount: number
  createdAt: string
  updatedAt: string
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}
