import { api } from '@/lib/api'

/** STALE = ficou aberta mais de 2 h: o agente parou sem avisar. */
export type SituacaoDaExecucao = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'STALE'

export type Execucao = { id: string; status: SituacaoDaExecucao; summary: string | null; startedAt: string; finishedAt: string | null }

/** Agente do Escritório (`GET /agents`). */
export type Agente = {
  id: string
  slug: string
  name: string
  role: string
  /** "04:00" (Fortaleza) ou null */
  scheduleTime: string | null
  /** Personagem em pixel art */
  character: string
  lastRun: Execucao | null
  nextRunAt: string | null
}

export const listarAgentes = () => api<Agente[]>('/agents')

export const listarExecucoes = (agenteId: string) => api<Execucao[]>(`/agents/${agenteId}/runs`)
