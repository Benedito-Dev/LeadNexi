import { api } from '../../lib/api.ts'
import type { PipelineBoard, PipelineSummary } from './types.ts'

export function getPipelines() {
  return api<PipelineSummary[]>('/pipelines')
}

export function getPipelineBoard(id: string) {
  return api<PipelineBoard>(`/pipelines/${id}`)
}
