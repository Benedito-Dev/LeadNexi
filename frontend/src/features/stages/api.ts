import { api } from '../../lib/api.ts'
import type { Stage } from '../pipelines/types.ts'

export function createStage(pipelineId: string, name: string) {
  return api<Stage>(`/pipelines/${pipelineId}/stages`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function renameStage(id: string, name: string) {
  return api<Stage>(`/stages/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
}

/** `stageIds` precisa ter todas as etapas do pipeline, na nova ordem. */
export function reorderStages(pipelineId: string, stageIds: string[]) {
  return api<Stage[]>(`/pipelines/${pipelineId}/stages/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ stageIds }),
  })
}

export function deleteStage(id: string) {
  return api<void>(`/stages/${id}`, { method: 'DELETE' })
}
