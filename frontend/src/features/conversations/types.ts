/** Mensagem do direct: recebida do lead ou enviada (pelo app do Instagram ou pelo LeadNexi) */
export interface ConversationMessage {
  id: string
  direction: 'received' | 'sent'
  text: string
  createdAt: string
}

/** Por que não dá para responder: sem direct, janela de 24 h fechada ou conexão expirada */
export type ReplyBlock = 'no-direct' | 'window-closed' | 'reconnect'

/** GET /leads/:id/instagram/conversation */
export interface Conversation {
  canReply: boolean
  blocked: ReplyBlock | null
  /** Até quando dá para responder (ISO): 24 h depois da última mensagem do lead */
  replyUntil: string | null
  /** Mais antiga primeiro */
  messages: ConversationMessage[]
}
