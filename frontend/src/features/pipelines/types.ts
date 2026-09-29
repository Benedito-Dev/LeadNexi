import type { Lead } from '../leads/types.ts'

export interface Stage {
  id: string
  name: string
  color: string | null
  position: number
  pipelineId: string
}

export interface Pipeline {
  id: string
  name: string
  position: number
}

/** GET /pipelines: cada pipeline com suas etapas (sem os leads) */
export interface PipelineSummary extends Pipeline {
  stages: Stage[]
}

/** GET /pipelines/:id: tudo que o Kanban precisa, já ordenado */
export interface PipelineBoard extends Pipeline {
  stages: (Stage & { leads: Lead[] })[]
}
