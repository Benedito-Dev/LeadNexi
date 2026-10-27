import { api, corpo } from '@/lib/api'
import type { Atividade, Etapa, Lead, PipelineResumo, Quadro, StageType } from './types'

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

// ============================================
// Ficha do lead
// ============================================

export type DadosLead = Partial<{
  name: string
  email: string | null
  phone: string | null
  instagramUsername: string | null
  estimatedValue: number | null
  source: string | null
  /** Fora do funil ("Não é lead" em Conversas) */
  archived: boolean
}>

export const atualizarLead = (id: string, dados: DadosLead) =>
  api<Lead>(`/leads/${id}`, { method: 'PATCH', body: corpo(dados) })

/** Lead com a etapa (para abrir a ficha fora do quadro, ex.: Conversas). */
export const buscarLead = (id: string) =>
  api<Lead & { stage: { id: string; name: string; stageType: StageType; pipelineId: string } }>(`/leads/${id}`)

export const apagarLead = (id: string) => api<void>(`/leads/${id}`, { method: 'DELETE' })

export const listarAtividades = (id: string) => api<Atividade[]>(`/leads/${id}/activities`)

export const adicionarNota = (id: string, text: string) =>
  api<Atividade>(`/leads/${id}/notes`, { method: 'POST', body: corpo({ text }) })

export const apagarNota = (id: string, notaId: string) => api<void>(`/leads/${id}/notes/${notaId}`, { method: 'DELETE' })

/** Agenda (ou reagenda) o próximo contato; fica registrado no histórico do lead. */
export const agendarContato = (id: string, dueAt: string) =>
  api<Lead>(`/leads/${id}/follow-up`, { method: 'PUT', body: corpo({ dueAt }) })

/** Desmarca o próximo contato. */
export const desmarcarContato = (id: string) => api<Lead>(`/leads/${id}/follow-up`, { method: 'DELETE' })

// ============================================
// Importação por planilha
// ============================================

export type LinhaImportacao = {
  name: string
  stageId: string
  phone?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  followUpAt?: string
  notes?: string
  neighborhood?: string
  address?: string
}

/** O que fazer com quem já está no CRM (mesmo @, telefone ou nome). */
export type ModoDuplicado = 'skip' | 'update' | 'duplicate'

export type ResultadoImportacao = {
  accepted: number
  skipped: number
  rows: { index: number; status: 'ready' | 'created' | 'updated' | 'duplicate' | 'invalid'; reason?: string }[]
}

/** Importa até 1.000 linhas por chamada; os importados ganham a origem "Planilha". Sem lista, vão para "Sem lista". */
export const importarLeads = (leads: LinhaImportacao[], duplicateMode: ModoDuplicado, listId?: string) =>
  api<ResultadoImportacao>('/leads/import', { method: 'POST', body: corpo({ leads, duplicateMode, listId }) })
