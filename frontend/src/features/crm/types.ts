import type { ResumoDaIA } from '../ia/api'

export type StageType = 'CONTACT' | 'SENT' | 'RESPONDED' | 'MEETING' | 'PROPOSAL' | 'WON' | 'LOST' | 'CUSTOM'

export type Etapa = {
  id: string
  name: string
  color: string | null
  stageType: StageType
  position: number
}

export type Lead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  instagramUsername: string | null
  estimatedValue: string | null
  stageId: string
  position: number
  followUpAt: string | null
  createdAt: string
  /** Último resumo da IA (botão "Resumir" da ficha) e quando foi feito. */
  aiSummary?: ResumoDaIA | null
  aiSummaryAt?: string | null
  _count?: { activities: number }
}

export type EtapaDoQuadro = Etapa & { leads: Lead[] }

/** Item do histórico do lead. A ficha mostra só as anotações (`NOTE`). */
export type Atividade = {
  id: string
  type: string
  text: string | null
  dueAt: string | null
  /** "claude" quando veio do servidor MCP */
  via?: string | null
  createdAt: string
}

export type PipelineResumo = { id: string; name: string; position: number; stages: Etapa[] }

export type Quadro = { id: string; name: string; stages: EtapaDoQuadro[] }

export type Opcao = { value: string; label: string }

/** Estado de cada coluna no quadro: os leads que passaram nos filtros e quantos estão à mostra. */
export type DadosDaColuna = { results: Lead[]; visiveis: number }
