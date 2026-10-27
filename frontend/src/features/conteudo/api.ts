import { api, corpo } from '@/lib/api'
import type { Post } from './tipos'

/** Posts do período (calendário): `de` e `ate` em ISO. */
export const listarPosts = (de: string, ate: string) => api<Post[]>(`/instagram/posts?${new URLSearchParams({ from: de, to: ate })}`)

/** Remarca um post agendado ou com falha (arrastar no calendário). */
export const remarcarPost = (id: string, scheduledAt: string) => api<Post>(`/instagram/posts/${id}`, { method: 'PATCH', body: corpo({ scheduledAt }) })

/** "Publicar agora" num agendado ou "Tentar de novo" num que falhou. */
export const publicarAgora = (id: string) => api<Post>(`/instagram/posts/${id}/publish`, { method: 'POST' })

/** Cancela um post que ainda não saiu (ou tira da lista um removido do Instagram). */
export const cancelarPost = (id: string) => api<void>(`/instagram/posts/${id}`, { method: 'DELETE' })

/** Se os agendados saem sozinhos na hora marcada. */
export const buscarPublicacao = () => api<{ automatic: boolean }>('/instagram/publishing')

/** Confere os publicados com o perfil: apagado lá vira REMOVED (e volta se reaparecer). */
export const sincronizarPosts = () => api<{ removed: number; restored: number }>('/instagram/posts/sync', { method: 'POST' })

/** Todos os posts (feed): os que ainda não saíram e os publicados. */
export const listarTodosOsPosts = () => api<Post[]>('/instagram/posts')
