import { api } from '../../lib/api.ts'
import type {
  CreatedInstagramPost,
  CreateInstagramPostInput,
  InstagramAccountStatus,
  InstagramAppSettings,
  InstagramPost,
  InstagramPostImage,
  InstagramPublishing,
  InstagramSyncResult,
  SaveInstagramAppSettingsInput,
} from './types.ts'

export function getInstagramAccount() {
  return api<InstagramAccountStatus>('/instagram/account')
}

/** Link do login oficial do Instagram (o navegador é redirecionado para ele) */
export function startInstagramConnect() {
  return api<{ url: string }>('/instagram/connect', { method: 'POST' })
}

export function getInstagramSettings() {
  return api<InstagramAppSettings>('/instagram/settings')
}

export function saveInstagramSettings(input: SaveInstagramAppSettingsInput) {
  return api<InstagramAppSettings>('/instagram/settings', { method: 'PUT', body: JSON.stringify(input) })
}

export function disconnectInstagram() {
  return api<void>('/instagram/account', { method: 'DELETE' })
}

/** Envia uma imagem (JPEG já preparado no navegador); ela fica solta até entrar num post */
export function uploadInstagramMedia(image: Blob) {
  const body = new FormData()
  body.append('file', image, 'imagem.jpg')
  return api<InstagramPostImage>('/instagram/media', { method: 'POST', body })
}

export function createInstagramPost(input: CreateInstagramPostInput) {
  return api<CreatedInstagramPost>('/instagram/posts', { method: 'POST', body: JSON.stringify(input) })
}

export function listInstagramPosts() {
  return api<InstagramPost[]>('/instagram/posts')
}

/** Confere os publicados com o perfil: apagado lá vira REMOVED (e volta se reaparecer) */
export function syncInstagramPosts() {
  return api<InstagramSyncResult>('/instagram/posts/sync', { method: 'POST' })
}

/** "Publicar agora" num agendado ou "Tentar de novo" num que falhou */
export function publishInstagramPost(id: string) {
  return api<InstagramPost>(`/instagram/posts/${id}/publish`, { method: 'POST' })
}

export function getInstagramPublishing() {
  return api<InstagramPublishing>('/instagram/publishing')
}

export function cancelInstagramPost(id: string) {
  return api<void>(`/instagram/posts/${id}`, { method: 'DELETE' })
}
