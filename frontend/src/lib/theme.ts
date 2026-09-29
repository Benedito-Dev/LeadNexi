import { useSyncExternalStore } from 'react'

// Tema da interface: escuro por padrão (BRAND.md, regra 3); a escolha fica no localStorage.
// O index.html aplica o tema salvo antes do React montar, para a tela não piscar.
export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'leadnexi.theme'
const THEME_COLOR: Record<Theme, string> = { dark: '#0B1020', light: '#F4F6FA' }
const listeners = new Set<() => void>()

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sem storage (aba privada): o tema vale só nesta sessão
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme)
}
