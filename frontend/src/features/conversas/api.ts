import { api, corpo } from '@/lib/api'
import type { Canal, Conversa, Historico, Mensagem } from './tipos'

type ConversaDoWhatsApp = Omit<Conversa, 'canal' | 'instagramUsername' | 'telefone'> & { phone: string | null }

/**
 * As conversas do Instagram e do WhatsApp numa lista só, pela última mensagem. Um canal fora do ar
 * não esconde o outro; só dá erro se os dois falharem.
 */
export async function listarConversas(): Promise<Conversa[]> {
  const [instagram, whatsapp] = await Promise.allSettled([
    api<Omit<Conversa, 'canal'>[]>('/instagram/inbox'),
    api<ConversaDoWhatsApp[]>('/whatsapp/inbox'),
  ])
  if (instagram.status === 'rejected' && whatsapp.status === 'rejected') throw instagram.reason
  const doInstagram = instagram.status === 'fulfilled' ? instagram.value.map((c): Conversa => ({ ...c, canal: 'instagram' })) : []
  const doWhatsApp =
    whatsapp.status === 'fulfilled'
      ? whatsapp.value.map(({ phone, ...c }): Conversa => ({ ...c, canal: 'whatsapp', instagramUsername: null, telefone: phone }))
      : []
  return [...doInstagram, ...doWhatsApp].sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''))
}

export const buscarHistorico = (leadId: string, canal: Canal) => api<Historico>(`/leads/${leadId}/${canal}/conversation`)

/**
 * Manda um texto pelo canal da conversa. Instagram: só até 24 h depois da última mensagem do lead,
 * e pode citar uma mensagem. WhatsApp: enquanto o número estiver conectado. Volta já no histórico.
 */
export const enviarMensagem = (leadId: string, canal: Canal, text: string, citada?: Mensagem | null) =>
  api<{ id: string; text: string; createdAt: string }>(`/leads/${leadId}/${canal}/messages`, {
    method: 'POST',
    body: corpo(canal === 'instagram' ? { text, replyToId: citada?.id } : { text }),
  }).then(
    (enviada): Mensagem => ({
      id: enviada.id,
      direction: 'sent',
      text: enviada.text ?? text,
      replyTo: citada ? { id: citada.id, direction: citada.direction, text: citada.text } : null,
      createdAt: enviada.createdAt,
    }),
  )

/** Coração numa mensagem do direct, ou tira (o Instagram só aceita o coração pela API). Mesma janela de 24 h. */
export const reagir = (leadId: string, mensagemId: string, curtir: boolean) =>
  api<{ id: string; reaction: string | null }>(`/leads/${leadId}/instagram/messages/${mensagemId}/reaction`, { method: curtir ? 'PUT' : 'DELETE' })

/** Foto de perfil guardada do lead (pública, com cache longo). */
export const fotoDoLead = (avatarId: string | null) => (avatarId ? `/api/leads/avatars/${avatarId}` : null)

/** Chave da conversa na tela: o mesmo lead pode conversar pelos dois canais */
export const chaveDaConversa = (c: Pick<Conversa, 'id' | 'canal'>) => `${c.canal}:${c.id}`
