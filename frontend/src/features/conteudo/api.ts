import { api, corpo } from '@/lib/api'
import type { Post } from './tipos'

/** Posts do período (calendário): `de` e `ate` em ISO. */
export const listarPosts = (de: string, ate: string) => api<Post[]>(`/instagram/posts?${new URLSearchParams({ from: de, to: ate })}`)

/** Remarca um post agendado ou com falha (arrastar no calendário). */
/** Rascunhos (sem data), o mais novo primeiro. */
export const listarRascunhos = () => api<Post[]>('/instagram/posts/drafts')

/** Remarca um post, ou agenda um rascunho (vira "Agendado"). */
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

/** Envia uma imagem (JPEG já preparado no navegador); ela fica solta até entrar num post. */
export const enviarImagem = (imagem: Blob) => {
  const arquivo = new FormData()
  arquivo.append('file', imagem, 'imagem.jpg')
  return api<{ id: string }>('/instagram/media', { method: 'POST', body: arquivo })
}

/** Post criado: agendado, publicado ou recusado; `alarmFailed` = o despertador não respondeu. */
export type PostCriado = Post & { alarmFailed?: boolean }

export const criarPost = (dados: { caption: string; mediaIds: string[]; scheduledAt?: string; publishNow?: boolean; draft?: boolean }) =>
  api<PostCriado>('/instagram/posts', { method: 'POST', body: corpo(dados) })

export type GrupoDeHashtags = { id: string; name: string; tags: string }

export const listarGruposDeHashtags = () => api<GrupoDeHashtags[]>('/instagram/hashtag-sets')

export const salvarGrupoDeHashtags = (dados: { name: string; tags: string }) =>
  api<GrupoDeHashtags>('/instagram/hashtag-sets', { method: 'POST', body: corpo(dados) })

export const apagarGrupoDeHashtags = (id: string) => api<void>(`/instagram/hashtag-sets/${id}`, { method: 'DELETE' })

/** Começa o envio do vídeo de um Reel: o servidor devolve o link para mandar o arquivo direto ao armazenamento. */
export const iniciarEnvioDeVideo = (dados: { mimeType: string; sizeBytes: number; width: number; height: number; durationMs: number }) =>
  api<{ id: string; uploadUrl: string; headers: Record<string, string> }>('/instagram/media/video', { method: 'POST', body: corpo(dados) })

/** Capa do Reel (um quadro do vídeo, em JPEG). */
export const enviarCapaDoVideo = (id: string, capa: Blob) => {
  const arquivo = new FormData()
  arquivo.append('file', capa, 'capa.jpg')
  return api<{ id: string }>(`/instagram/media/${id}/poster`, { method: 'POST', body: arquivo })
}

/** O vídeo terminou de subir: o servidor confere o arquivo e libera para entrar num post. */
export const confirmarVideo = (id: string) => api<{ id: string }>(`/instagram/media/${id}/complete`, { method: 'POST' })
