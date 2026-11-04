import { api, corpo } from '@/lib/api'

/** Automação do Instagram: comentário num post vira mensagem no direct. */
/** O que dispara a automação */
export type Gatilho = 'COMMENT' | 'STORY_REPLY' | 'STORY_MENTION' | 'DM_KEYWORD'

export const GATILHOS: { valor: Gatilho; rotulo: string; texto: string }[] = [
  { valor: 'COMMENT', rotulo: 'Comentário no post', texto: 'Comentou no post ou Reel' },
  { valor: 'STORY_REPLY', rotulo: 'Resposta ao story', texto: 'Respondeu um story seu' },
  { valor: 'STORY_MENTION', rotulo: 'Menção no story', texto: 'Marcou você no story' },
  { valor: 'DM_KEYWORD', rotulo: 'Palavra no direct', texto: 'Mandou a palavra no direct' },
]

export type Automacao = {
  id: string
  name: string
  active: boolean
  trigger: Gatilho
  /** Posts na Meta; vazio = qualquer post ou Reel */
  mediaIds: string[]
  /** Palavras que disparam; vazio = qualquer comentário */
  keywords: string[]
  message: string
  /** Respostas públicas no comentário (uma sorteada); vazio = não responde em público */
  publicReplies: string[]
  /** Botão embaixo da mensagem; null = só texto (a mensagem já é a entrega) */
  buttonLabel: string | null
  /** O que chega ao tocar no botão */
  deliveryMessage: string | null
  /** Só entrega para quem segue a conta */
  requireFollow: boolean
  /** Para quem tocou e não segue; null = o texto padrão */
  notFollowingMessage: string | null
  /** No CRM: etapa para onde o lead vai (só para frente) e lista em que entra; null = não mexe */
  stageId: string | null
  listId: string | null
  createdAt: string
  /** Mensagens enviadas e recusadas pela Meta */
  sent: number
  failed: number
  /** Com botão: quantos tocaram e receberam a entrega */
  delivered: number
  /** Placar: pessoas que receberam e quantas delas fecharam */
  leads: number
  won: number
  lastSentAt: string | null
}

export type DadosDaAutomacao = Pick<
  Automacao,
  'name' | 'trigger' | 'mediaIds' | 'keywords' | 'message' | 'publicReplies' | 'buttonLabel' | 'deliveryMessage' | 'requireFollow' | 'notFollowingMessage' | 'stageId' | 'listId'
> & { active?: boolean }

/** Um comentário que disparou a automação. */
export type Disparo = {
  id: string
  mediaId: string
  username: string | null
  commentText: string
  leadId: string | null
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED'
  error: string | null
  /** Com botão: quando tocou e recebeu a entrega */
  deliveredAt: string | null
  createdAt: string
}

/** Limite da mensagem no direct (o da Meta) */
export const LIMITE_DA_MENSAGEM = 1000
/** Com botão, o texto acima dele tem o limite do modelo da Meta */
export const LIMITE_COM_BOTAO = 640
/** Texto do botão (limite da Meta) */
export const LIMITE_DO_BOTAO = 20
/** O mesmo texto padrão do servidor, para quem não segue */
export const TEXTO_PADRAO_DE_SEGUIR = 'Quase lá! Siga o perfil e toque no botão de novo para receber.'

export const listarAutomacoes = () => api<Automacao[]>('/instagram/automations')

export const criarAutomacao = (dados: DadosDaAutomacao) => api<Automacao>('/instagram/automations', { method: 'POST', body: corpo(dados) })

export const editarAutomacao = (id: string, dados: Partial<DadosDaAutomacao>) =>
  api<Automacao>(`/instagram/automations/${id}`, { method: 'PATCH', body: corpo(dados) })

export const apagarAutomacao = (id: string) => api<void>(`/instagram/automations/${id}`, { method: 'DELETE' })

export const listarDisparos = (id: string) => api<Disparo[]>(`/instagram/automations/${id}/runs`)
