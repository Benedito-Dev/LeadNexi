import { ApiError } from '../../lib/api.ts'
import type { InstagramPost, InstagramPostStatus } from './types.ts'

/** Rótulo e cor de cada status do post (BRAND.md, seção 9.5) */
export const POST_STATUS: Record<InstagramPostStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Agendado', tone: 'text-slate-300' },
  PUBLISHING: { label: 'Publicando', tone: 'text-slate-300' },
  PUBLISHED: { label: 'Publicado', tone: 'text-success' },
  FAILED: { label: 'Falhou', tone: 'text-danger' },
}

/** Ainda não saiu: dá para publicar agora (ou tentar de novo) e cancelar */
export function isPending(post: InstagramPost) {
  return post.status === 'SCHEDULED' || post.status === 'FAILED'
}

/** Data que importa: quando saiu (publicado) ou quando está marcado para sair */
export function postDate(post: InstagramPost) {
  return post.publishedAt ?? post.scheduledAt
}

/** Erro de uma ação no post: o motivo do servidor (409/404) ou uma mensagem genérica. */
export function actionErrorMessage(error: Error | null, fallback: string) {
  if (!error) return null
  return error instanceof ApiError && (error.status === 409 || error.status === 404) ? error.message : fallback
}
