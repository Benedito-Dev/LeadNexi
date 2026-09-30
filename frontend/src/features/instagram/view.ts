import { useState } from 'react'

/** Como a lista de posts aparece: lista (detalhes) ou grade (capas, como o perfil do Instagram) */
export type PostView = 'lista' | 'grade'

const STORAGE_KEY = 'leadnexi.instagram.view'

/** Visualização escolhida, lembrada neste navegador (sem storage, vale só nesta sessão). */
export function usePostView() {
  const [view, setView] = useState<PostView>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'grade' ? 'grade' : 'lista'
    } catch {
      return 'lista'
    }
  })

  function change(next: PostView) {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Aba privada ou storage bloqueado: a escolha vale só até recarregar
    }
  }

  return [view, change] as const
}
