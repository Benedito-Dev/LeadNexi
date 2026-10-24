import { api, corpo } from '@/lib/api'
import type { LeadDoPainel, PainelDeHoje } from './tipos'

export const buscarPainel = () => api<PainelDeHoje>('/leads/today')

/** Marca o próximo contato como feito (sai do lead e fica no histórico). */
export const concluirContato = (id: string) => api<LeadDoPainel>(`/leads/${id}/follow-up/complete`, { method: 'POST' })

/** Registra a mensagem enviada pelo WhatsApp: avança a cadência do lead. */
export const registrarWhatsAppEnviado = (id: string, message: string) =>
  api<LeadDoPainel>(`/leads/${id}/whatsapp/sent`, { method: 'POST', body: corpo({ message }) })
