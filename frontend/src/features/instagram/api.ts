import { api } from '../../lib/api.ts'
import type { InstagramAccountStatus } from './types.ts'

export function getInstagramAccount() {
  return api<InstagramAccountStatus>('/instagram/account')
}

/** Link do login oficial do Instagram (o navegador é redirecionado para ele) */
export function startInstagramConnect() {
  return api<{ url: string }>('/instagram/connect', { method: 'POST' })
}

export function disconnectInstagram() {
  return api<void>('/instagram/account', { method: 'DELETE' })
}
