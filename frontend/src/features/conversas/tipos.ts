/** Canal da conversa: o direct do Instagram ou o WhatsApp (não oficial, conectado pelo QR code). */
export type Canal = 'instagram' | 'whatsapp'

/** GET /instagram/inbox e /whatsapp/inbox: uma conversa, com a última mensagem. Toda pessoa que escreveu é um lead. */
export type Conversa = {
  /** ID do lead */
  id: string
  canal: Canal
  name: string
  instagramUsername: string | null
  /** Telefone (conversas do WhatsApp) */
  telefone?: string | null
  avatarId: string | null
  /** "Não é lead": fora do funil (arquivado) */
  archived: boolean
  stageName: string
  /** Ainda dá para responder (janela de 24 h do Instagram; no WhatsApp, sempre) */
  canReply: boolean
  lastMessage: { text: string; direction: 'received' | 'sent'; createdAt: string } | null
}

export type Mensagem = {
  id: string
  direction: 'received' | 'sent'
  text: string
  /** Sua reação a esta mensagem (emoji) e a do lead */
  reaction?: string | null
  leadReaction?: string | null
  /** Mensagem que esta responde (citada) */
  replyTo?: { id: string; direction: 'received' | 'sent'; text: string } | null
  createdAt: string
}

/** GET /leads/:id/instagram/conversation e /leads/:id/whatsapp/conversation */
export type Historico = {
  canReply: boolean
  /** Por que não dá. Instagram: nunca mandou direct, passaram 24 h ou a conexão expirou. WhatsApp: sem conversa ou desconectado */
  blocked: 'no-direct' | 'window-closed' | 'reconnect' | 'no-whatsapp' | 'disconnected' | null
  replyUntil: string | null
  /** Mais antiga primeiro */
  messages: Mensagem[]
}
