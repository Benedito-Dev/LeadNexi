import type { Lead } from '../leads/types.ts'

export interface Stage {
  id: string
  name: string
  color: string | null
  position: number
  pipelineId: string
  leads?: Lead[]
}

export interface Pipeline {
  id: string
  name: string
  position: number
  stages?: Stage[]
}
