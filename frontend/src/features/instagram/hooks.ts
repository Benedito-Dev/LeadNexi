import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  cancelInstagramPost,
  createInstagramPost,
  disconnectInstagram,
  getInstagramAccount,
  getInstagramSettings,
  listInstagramPosts,
  saveInstagramSettings,
  startInstagramConnect,
  uploadInstagramMedia,
} from './api.ts'

export const instagramKeys = {
  account: ['instagram', 'account'] as const,
  posts: ['instagram', 'posts'] as const,
  settings: ['instagram', 'settings'] as const,
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

export function useInstagramPosts() {
  return useQuery({ queryKey: instagramKeys.posts, queryFn: listInstagramPosts })
}

export interface SchedulePostInput {
  /** Imagens na ordem do carrossel (id local + JPEG pronto) */
  images: { id: string; blob: Blob }[]
  caption: string
  /** ISO 8601 */
  scheduledAt: string
}

/**
 * Agenda um post: envia as imagens uma a uma (cada requisição fica pequena) e cria o post.
 * Se algo falhar no meio, tentar de novo reaproveita as imagens que já subiram.
 */
export function useSchedulePost() {
  const queryClient = useQueryClient()
  const uploaded = useRef(new Map<string, string>())
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ images, caption, scheduledAt }: SchedulePostInput) => {
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
      return createInstagramPost({ caption, scheduledAt, mediaIds })
    },
    onSuccess: () => {
      uploaded.current.clear()
      return queryClient.invalidateQueries({ queryKey: instagramKeys.posts })
    },
    onSettled: () => setProgress(null),
  })
  return { ...mutation, progress }
}

export function useCancelPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInstagramPost,
    onSettled: () => queryClient.invalidateQueries({ queryKey: instagramKeys.posts }),
  })
}
