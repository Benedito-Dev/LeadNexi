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
  createdAt: string
  updatedAt: string
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
