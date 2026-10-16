import { api } from '../../lib/api.ts'
import type { Pipeline, PipelineBoard, PipelineSummary } from './types.ts'

export function getPipelines() {
  return api<PipelineSummary[]>('/pipelines')
}

export function getPipelineBoard(id: string, options: { listId?: string; includeArchived?: boolean } = {}) {
  const params = new URLSearchParams()
  if (options.listId) params.set('listId', options.listId)
  if (options.includeArchived) params.set('includeArchived', 'true')
  const query = params.toString()
  return api<PipelineBoard>(`/pipelines/${id}${query ? `?${query}` : ''}`)
}

/** Cria o funil no fim da lista, com as etapas iniciais na ordem enviada. */
export function createPipeline(name: string, stageNames: string[]) {
  return api<PipelineSummary>('/pipelines', {
    method: 'POST',
    body: JSON.stringify({ name, stages: stageNames.map((stageName) => ({ name: stageName })) }),
  })
}

export function renamePipeline(id: string, name: string) {
  return api<Pipeline>(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
}

/** Só funil sem leads pode ser apagado (409 caso contrário). */
export function deletePipeline(id: string) {
  return api<void>(`/pipelines/${id}`, { method: 'DELETE' })
}
