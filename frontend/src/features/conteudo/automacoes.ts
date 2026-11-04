import { api, corpo } from '@/lib/api'

/** Automação do Instagram: comentário num post vira mensagem no direct. */
export type Automacao = {
  id: string
  name: string
  active: boolean
  /** Posts na Meta; vazio = qualquer post ou Reel */
  mediaIds: string[]
  /** Palavras que disparam; vazio = qualquer comentário */
  keywords: string[]
  message: string
  /** Respostas públicas no comentário (uma sorteada); vazio = não responde em público */
  publicReplies: string[]
  createdAt: string
  /** Mensagens enviadas e recusadas pela Meta */
  sent: number
  failed: number
  lastSentAt: string | null
}

export type DadosDaAutomacao = Pick<Automacao, 'name' | 'mediaIds' | 'keywords' | 'message' | 'publicReplies'> & { active?: boolean }

/** Um comentário que disparou a automação. */
export type Disparo = {
  id: string
  mediaId: string
  username: string | null
  commentText: string
  leadId: string | null
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED'
  error: string | null
  createdAt: string
}

/** Limite da mensagem no direct (o da Meta) */
export const LIMITE_DA_MENSAGEM = 1000

export const listarAutomacoes = () => api<Automacao[]>('/instagram/automations')

export const criarAutomacao = (dados: DadosDaAutomacao) => api<Automacao>('/instagram/automations', { method: 'POST', body: corpo(dados) })

export const editarAutomacao = (id: string, dados: Partial<DadosDaAutomacao>) =>
  api<Automacao>(`/instagram/automations/${id}`, { method: 'PATCH', body: corpo(dados) })

export const apagarAutomacao = (id: string) => api<void>(`/instagram/automations/${id}`, { method: 'DELETE' })

export const listarDisparos = (id: string) => api<Disparo[]>(`/instagram/automations/${id}/runs`)
