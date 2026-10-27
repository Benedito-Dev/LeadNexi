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

/** Avisa os outros lugares que mostram o tema (botão do topo, Perfil) que ele mudou. */
const EVENTO = 'leadnexi-tema'

/** Claro, escuro ou sistema, com a classe `dark` no <html> (mesmo esquema do Rizar). */
export function useTheme() {
  const [mode, setModeState] = useState<ModoTema>(lerModo)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => media().matches)
  const isDark = mode === 'dark' || (mode === 'auto' && sistemaEscuro)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const aoTrocar = (e: Event) => setModeState((e as CustomEvent<ModoTema>).detail)
    window.addEventListener(EVENTO, aoTrocar)
    return () => window.removeEventListener(EVENTO, aoTrocar)
  }, [])

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
    window.dispatchEvent(new CustomEvent<ModoTema>(EVENTO, { detail: novo }))
  }

  return { mode, setMode, isDark }
}
