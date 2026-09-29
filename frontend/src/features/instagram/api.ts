import { api } from '../../lib/api.ts'
import type {
  CreateInstagramPostInput,
  InstagramAccountStatus,
  InstagramPost,
  InstagramPostImage,
} from './types.ts'

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

/** Envia uma imagem (JPEG já preparado no navegador); ela fica solta até entrar num post */
export function uploadInstagramMedia(image: Blob) {
  const body = new FormData()
  body.append('file', image, 'imagem.jpg')
  return api<InstagramPostImage>('/instagram/media', { method: 'POST', body })
}

export function createInstagramPost(input: CreateInstagramPostInput) {
  return api<InstagramPost>('/instagram/posts', { method: 'POST', body: JSON.stringify(input) })
}

export function listInstagramPosts() {
  return api<InstagramPost[]>('/instagram/posts')
}

export function cancelInstagramPost(id: string) {
  return api<void>(`/instagram/posts/${id}`, { method: 'DELETE' })
}
