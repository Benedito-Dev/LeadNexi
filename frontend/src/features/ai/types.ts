/** Aviso das regras de ouro: número fora do banco de provas ou promessa de resultado */
export interface GuardrailWarning {
  kind: 'number' | 'promise'
  detail: string
}

export type AiChannel = 'whatsapp' | 'instagram'

export interface AiStatus {
  configured: boolean
  model: string
}

export interface MessageOption {
  label: string
  text: string
  /** Template base (B1 a B8) ou "livre" */
  template: string
  warnings: GuardrailWarning[]
}

/** POST /leads/:id/ai/message */
export interface MessageSuggestions {
  suggestionId: string
  model: string
  /** Passo da cadência (1 a 3); null = continuação de conversa */
  step: number | null
  options: MessageOption[]
}

export type ReplyIntent =
  | 'interested'
  | 'price'
  | 'objection'
  | 'forwarded'
  | 'auto_reply'
  | 'not_interested'
  | 'other'

/** POST /leads/:id/ai/reply */
export interface ReplySuggestion {
  suggestionId: string
  model: string
  intent: ReplyIntent
  objection: string | null
  warning: string | null
  responsibleName: string | null
  options: { label: string; text: string; warnings: GuardrailWarning[] }[]
}

/** POST /leads/:id/ai/analysis */
export interface FreeAnalysis {
  suggestionId: string
  model: string
  headline: string
  findings: string[]
  opportunities: string[]
  reference: { text: string; source: string } | null
  invitation: string
  warnings: GuardrailWarning[]
}

/** Banco de provas: resultados reais que a IA pode citar */
export interface Proof {
  id: string
  text: string
  highlight: string | null
  source: string
  referenceDate: string | null
  canNameClient: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProofInput = Pick<Proof, 'text' | 'source'> &
  Partial<Pick<Proof, 'highlight' | 'referenceDate' | 'canNameClient' | 'active'>>
