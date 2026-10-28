import { api } from '@/lib/api'
import type { SituacaoDaSessao, SituacaoDoWhatsApp } from './tipos'

export const buscarSituacao = () => api<SituacaoDoWhatsApp>('/whatsapp/status')

/** Prepara a conexão e devolve o QR code (imagem em data URL); `qr: null` se já está conectado. */
export const pedirQrCode = () => api<{ state: SituacaoDaSessao; qr: string | null }>('/whatsapp/connect', { method: 'POST' })

export const desconectarWhatsApp = () => api<void>('/whatsapp/session', { method: 'DELETE' })
