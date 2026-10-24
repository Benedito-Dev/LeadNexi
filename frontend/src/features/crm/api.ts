import { api, corpo } from '@/lib/api'
import type { Etapa, Lead, PipelineResumo, Quadro, StageType } from './types'

export const listarPipelines = () => api<PipelineResumo[]>('/pipelines')

export const buscarQuadro = (pipelineId: string) => api<Quadro>(`/pipelines/${pipelineId}`)

export const moverLead = (id: string, stageId: string, position: number, lostReason?: string) =>
  api<Lead>(`/leads/${id}/move`, { method: 'PATCH', body: corpo({ stageId, position, lostReason }) })

export type NovoLead = {
  name: string
  stageId: string
  phone?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  followUpAt?: string
  source?: string
}

export const criarLead = (dados: NovoLead) => api<Lead>('/leads', { method: 'POST', body: corpo(dados) })

export const criarPipeline = (name: string, stages: { name: string; color: string; stageType: StageType }[] = []) =>
  api<PipelineResumo>('/pipelines', { method: 'POST', body: corpo({ name, stages }) })

export const renomearPipeline = (id: string, name: string) =>
  api<PipelineResumo>(`/pipelines/${id}`, { method: 'PATCH', body: corpo({ name }) })

export const excluirPipeline = (id: string) => api<void>(`/pipelines/${id}`, { method: 'DELETE' })

export type DadosEtapa = { name: string; color: string; stageType: StageType }

export const criarEtapa = (pipelineId: string, dados: DadosEtapa) =>
  api<Etapa>(`/pipelines/${pipelineId}/stages`, { method: 'POST', body: corpo(dados) })

export const atualizarEtapa = (id: string, dados: Partial<DadosEtapa>) =>
  api<Etapa>(`/stages/${id}`, { method: 'PATCH', body: corpo(dados) })

export const excluirEtapa = (id: string) => api<void>(`/stages/${id}`, { method: 'DELETE' })

/** Grava a ordem nova das etapas; o servidor devolve a lista já na ordem final. */
export const reordenarEtapas = (pipelineId: string, stageIds: string[]) =>
  api<Etapa[]>(`/pipelines/${pipelineId}/stages/reorder`, { method: 'PATCH', body: corpo({ stageIds }) })
