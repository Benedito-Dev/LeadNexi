import { useEffect, useState } from 'react'

export type ModoTema = 'light' | 'dark' | 'auto'

const CHAVE = '@leadnexi-theme-mode'
const MODOS: ModoTema[] = ['light', 'dark', 'auto']

function lerModo(): ModoTema {
  try {
    const salvo = localStorage.getItem(CHAVE) as ModoTema | null
    if (salvo && MODOS.includes(salvo)) return salvo
  } catch {
    // Armazenamento bloqueado: segue o sistema
  }
  return 'auto'
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Claro, escuro ou sistema, com a classe `dark` no <html> (mesmo esquema do Rizar). */
export function useTheme() {
  const [mode, setModeState] = useState<ModoTema>(lerModo)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => media().matches)
  const isDark = mode === 'dark' || (mode === 'auto' && sistemaEscuro)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const m = media()
    const aoMudar = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches)
    m.addEventListener('change', aoMudar)
    return () => m.removeEventListener('change', aoMudar)
  }, [])

  const setMode = (novo: ModoTema) => {
    setModeState(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // Sem armazenamento, o tema vale só nesta aba
    }
  }

  return { mode, setMode, isDark }
}
