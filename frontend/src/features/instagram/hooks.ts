import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  cancelInstagramPost,
  createInstagramPost,
  disconnectInstagram,
  getInstagramAccount,
  getInstagramPublishing,
  getInstagramSettings,
  listInstagramPosts,
  publishInstagramPost,
  saveInstagramSettings,
  startInstagramConnect,
  uploadInstagramMedia,
} from './api.ts'
import type { InstagramPost } from './types.ts'

export const instagramKeys = {
  account: ['instagram', 'account'] as const,
  posts: ['instagram', 'posts'] as const,
  settings: ['instagram', 'settings'] as const,
  publishing: ['instagram', 'publishing'] as const,
}

export function useInstagramSettings() {
  return useQuery({ queryKey: instagramKeys.settings, queryFn: getInstagramSettings })
}

export function useSaveInstagramSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveInstagramSettings,
    onSuccess: (settings) => queryClient.setQueryData(instagramKeys.settings, settings),
  })
}

export function useInstagramAccount() {
  return useQuery({ queryKey: instagramKeys.account, queryFn: getInstagramAccount })
}

/** Pede o link de login e leva o navegador até o Instagram. */
export function useConnectInstagram() {
  return useMutation({
    mutationFn: startInstagramConnect,
    onSuccess: ({ url }) => window.location.assign(url),
  })
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnectInstagram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: instagramKeys.account }),
  })
}

/** Lista de posts. Com post saindo agora (ou quase), confere a cada 15 s; com agendados, a cada minuto. */
export function useInstagramPosts() {
  return useQuery({
    queryKey: instagramKeys.posts,
    queryFn: listInstagramPosts,
    refetchInterval: (query) => {
      const posts = query.state.data ?? []
      const soon = Date.now() + 2 * 60_000
      if (
        posts.some(
          (post) =>
            post.status === 'PUBLISHING' ||
            (post.status === 'SCHEDULED' && new Date(post.scheduledAt).getTime() <= soon),
        )
      ) {
        return 15_000
      }
      return posts.some((post) => post.status === 'SCHEDULED') ? 60_000 : false
    },
  })
}

export function useInstagramPublishing() {
  return useQuery({ queryKey: instagramKeys.publishing, queryFn: getInstagramPublishing })
}

export interface SchedulePostInput {
  /** Imagens na ordem do carrossel (id local + JPEG pronto) */
  images: { id: string; blob: Blob }[]
  caption: string
  /** ISO 8601 (para agendar) */
  scheduledAt?: string
  /** Publicar na hora */
  publishNow?: boolean
}

/**
 * Agenda (ou publica na hora) um post: envia as imagens uma a uma (cada requisição fica pequena)
 * e cria o post. Se algo falhar no meio, tentar de novo reaproveita as imagens que já subiram.
 */
export function useSchedulePost() {
  const queryClient = useQueryClient()
  const uploaded = useRef(new Map<string, string>())
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ images, caption, scheduledAt, publishNow }: SchedulePostInput) => {
      const mediaIds: string[] = []
      for (const [index, image] of images.entries()) {
        setProgress({ sent: index, total: images.length })
        let mediaId = uploaded.current.get(image.id)
        if (!mediaId) {
          mediaId = (await uploadInstagramMedia(image.blob)).id
          uploaded.current.set(image.id, mediaId)
        }
        mediaIds.push(mediaId)
      }
      setProgress(null)
      return createInstagramPost({ caption, mediaIds, ...(publishNow ? { publishNow } : { scheduledAt }) })
    },
    onSuccess: () => {
      uploaded.current.clear()
      // A conta também: a Meta pode ter recusado o token na publicação
      return queryClient.invalidateQueries({ queryKey: ['instagram'] })
    },
    onSettled: () => setProgress(null),
  })
  return { ...mutation, progress }
}

/** "Publicar agora"/"Tentar de novo": o post aparece como "Publicando" até a resposta chegar. */
export function usePublishPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: publishInstagramPost,
    onMutate: (id) =>
      queryClient.setQueryData<InstagramPost[]>(instagramKeys.posts, (posts) =>
        posts?.map((post) => (post.id === id ? { ...post, status: 'PUBLISHING', error: null } : post)),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['instagram'] }),
  })
}

export function useCancelPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInstagramPost,
    onSettled: () => queryClient.invalidateQueries({ queryKey: instagramKeys.posts }),
  })
}
