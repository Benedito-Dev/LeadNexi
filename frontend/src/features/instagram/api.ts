import { api } from '../../lib/api.ts'
import type {
  CreatedInstagramPost,
  CreateInstagramPostInput,
  HashtagSet,
  InboxConversation,
  ProofPost,
  UpdateInstagramPostInput,
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

export function listInstagramPosts(range?: { from: string; to: string }) {
  return api<InstagramPost[]>(range ? `/instagram/posts?${new URLSearchParams(range)}` : '/instagram/posts')
}

export function updateInstagramPost(id: string, input: UpdateInstagramPostInput) {
  return api<CreatedInstagramPost>(`/instagram/posts/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function getProofPosts() {
  return api<ProofPost[]>('/instagram/posts/proofs')
}

export function getHashtagSets() {
  return api<HashtagSet[]>('/instagram/hashtag-sets')
}

export function createHashtagSet(input: { name: string; tags: string }) {
  return api<HashtagSet>('/instagram/hashtag-sets', { method: 'POST', body: JSON.stringify(input) })
}

export function deleteHashtagSet(id: string) {
  return api<void>(`/instagram/hashtag-sets/${id}`, { method: 'DELETE' })
}

export function getInbox() {
  return api<InboxConversation[]>('/instagram/inbox')
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
