/** A Meta só aceita resposta até 24 h depois da última mensagem do lead */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000
/** Limite da Meta para o texto: 1.000 bytes em UTF-8 (acento e emoji ocupam mais de 1) */
export const MAX_MESSAGE_BYTES = 1000

/** Dá para responder: até 24 h depois da última mensagem do lead */
export function replyWindowOpen(lastMessageAt: string | null, now = Date.now()) {
  return lastMessageAt !== null && now - new Date(lastMessageAt).getTime() < REPLY_WINDOW_MS
}
