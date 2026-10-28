/** open = conectado · connecting = esperando ler o QR · close = desconectado */
export type SituacaoDaSessao = 'open' | 'connecting' | 'close'

/** GET /whatsapp/status */
export type SituacaoDoWhatsApp =
  | { configured: false }
  | { configured: true; reachable: false }
  | { configured: true; reachable: true; state: SituacaoDaSessao; phone: string | null; name: string | null }
