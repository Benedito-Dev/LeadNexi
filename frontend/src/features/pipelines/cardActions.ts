import { whatsappUrl } from '../../lib/format.ts'
import type { Lead } from '../leads/types.ts'

/** Botões sobre o card: WhatsApp (com telefone válido) e conversa do direct (quem já mandou direct). */
export function cardActions(lead: Lead) {
  const whatsapp = lead.phone !== null && whatsappUrl(lead.phone) !== null
  return Number(whatsapp) + Number(lead.instagramUserId !== null)
}
