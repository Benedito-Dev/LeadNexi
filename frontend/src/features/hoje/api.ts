import { api, corpo } from '@/lib/api'
import type { LeadDoPainel, PainelDeHoje } from './tipos'

export const buscarPainel = () => api<PainelDeHoje>('/leads/today')

/** Marca o próximo contato como feito (sai do lead e fica no histórico). */
export const concluirContato = (id: string) => api<LeadDoPainel>(`/leads/${id}/follow-up/complete`, { method: 'POST' })

/** De onde veio o texto enviado (ex.: `ia-B1` + a abordagem), para o teste de mensagens em Resultados. */
export type OrigemDaMensagem = { templateId: string; variation: string }

/** Registra a mensagem enviada pelo WhatsApp: avança a cadência do lead. */
export const registrarWhatsAppEnviado = (id: string, message: string, origem?: OrigemDaMensagem | null) =>
  api<LeadDoPainel>(`/leads/${id}/whatsapp/sent`, { method: 'POST', body: corpo({ message, ...origem }) })

/** Como ficou a conversa depois da sua resposta. */
export type ComoFicou = 'waiting' | 'later' | 'meeting' | 'won' | 'lost'

/** Registra a sua resposta numa conversa e o combinado (retorno, reunião, fechou, sem interesse). */
export const registrarConversa = (id: string, outcome: ComoFicou, at?: string) =>
  api<LeadDoPainel>(`/leads/${id}/whatsapp/conversation`, { method: 'POST', body: corpo({ outcome, at }) })
