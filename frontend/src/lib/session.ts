import { useSyncExternalStore } from 'react'

// Token JWT da sessão: fica em memória, é persistido no localStorage e
// avisa os componentes (useToken) quando muda — login, logout ou expiração.
const STORAGE_KEY = 'leadnexi.token'
const listeners = new Set<() => void>()

let currentToken = readStoredToken()

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function getToken(): string | null {
  return currentToken
}

export function setToken(token: string | null) {
  currentToken = token
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Armazenamento bloqueado (ex.: modo privado): a sessão vale só nesta aba
  }
  notify()
}

// Login ou logout feito em outra aba
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  currentToken = event.newValue
  notify()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken)
}
