export interface Lead {
  id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
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
}

export interface CreateLeadInput extends LeadInput {
  stageId: string
}

export interface MoveLeadInput {
  stageId: string
  /** Posição de destino na coluna (0 = topo) */
  position: number
}

/** Lead como vem de GET /leads e GET /leads/:id: com o resumo da etapa */
export interface LeadWithStage extends Lead {
  stage: { id: string; name: string; pipelineId: string }
}

/** Filtros de GET /leads */
export interface LeadListQuery {
  search?: string
  stageId?: string
  source?: string
  page: number
  limit: number
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}
