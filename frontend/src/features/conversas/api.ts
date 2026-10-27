import { api, corpo } from '@/lib/api'
import type { Conversa, Historico, Mensagem } from './tipos'

export const listarConversas = () =>
  api<Omit<Conversa, 'canal'>[]>('/instagram/inbox').then((lista) => lista.map((c): Conversa => ({ ...c, canal: 'instagram' })))

export const buscarHistorico = (leadId: string) => api<Historico>(`/leads/${leadId}/instagram/conversation`)

/** Manda um texto no direct (só até 24 h depois da última mensagem do lead). Volta já no histórico. */
export const enviarMensagem = (leadId: string, text: string) =>
  api<{ id: string; text: string; createdAt: string }>(`/leads/${leadId}/instagram/messages`, { method: 'POST', body: corpo({ text }) }).then(
    (enviada): Mensagem => ({ id: enviada.id, direction: 'sent', text: enviada.text ?? text, createdAt: enviada.createdAt }),
  )

/** Foto de perfil guardada do lead (pública, com cache longo). */
export const fotoDoLead = (avatarId: string | null) => (avatarId ? `/api/leads/avatars/${avatarId}` : null)
