import { useState } from 'react'

/** Como os posts aparecem: lista (detalhes), grade (capas, como o perfil) ou calendário */
export type PostView = 'lista' | 'grade' | 'calendario'

const VIEWS: PostView[] = ['lista', 'grade', 'calendario']

const STORAGE_KEY = 'leadnexi.instagram.view'

/** Visualização escolhida, lembrada neste navegador (sem storage, vale só nesta sessão). */
export function usePostView() {
  const [view, setView] = useState<PostView>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return VIEWS.find((view) => view === saved) ?? 'lista'
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
