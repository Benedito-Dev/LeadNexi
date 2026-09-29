import { useSyncExternalStore } from 'react'

// Sessão do usuário. O access token (JWT de 15 min) fica SÓ em memória: nenhum script injetado
// consegue lê-lo de um storage. A sessão longa é o refresh token, num cookie httpOnly que o
// navegador envia sozinho para /api/auth. Ao abrir o app, `bootstrapSession` troca o cookie por
// um access token; quando ele vence, `refreshSession` renova (uma requisição só, mesmo com várias
// chamadas falhando juntas).

/** checking: restaurando a sessão ao abrir · ready: já se sabe se há sessão · offline: servidor fora */
export type SessionStatus = 'checking' | 'ready' | 'offline'

/** Chave antiga (token no localStorage): removida ao carregar */
const LEGACY_STORAGE_KEY = 'leadnexi.token'

let currentToken: string | null = null
let status: SessionStatus = 'checking'
let refreshing: Promise<RefreshResult> | null = null
const listeners = new Set<() => void>()

try {
  localStorage.removeItem(LEGACY_STORAGE_KEY)
} catch {
  // Storage bloqueado: nada a limpar
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function getToken(): string | null {
  return currentToken
}

export function setToken(token: string | null) {
  currentToken = token
  notify()
}

/** unauthenticated: sem sessão válida (vai para o login) · error: servidor inacessível */
export type RefreshResult = { token: string } | 'unauthenticated' | 'error'

/** Troca o refresh token (cookie) por um access token novo. Chamadas simultâneas compartilham a mesma requisição. */
export function refreshSession(): Promise<RefreshResult> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (res): Promise<RefreshResult> => {
      if (res.ok) return { token: ((await res.json()) as { accessToken: string }).accessToken }
      return res.status === 401 ? 'unauthenticated' : 'error'
    })
    .catch((): RefreshResult => 'error')
    .then((result) => {
      if (result === 'unauthenticated') setToken(null)
      else if (result !== 'error') setToken(result.token)
      return result
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** Ao abrir o app (e no "Tentar de novo"): restaura a sessão a partir do cookie. */
export async function bootstrapSession() {
  status = 'checking'
  notify()
  const result = await refreshSession()
  status = result === 'error' ? 'offline' : 'ready'
  notify()
}

/** Encerra a sessão no servidor e avisa as outras abas. */
export async function endSession() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    // Sem rede: o token some daqui mesmo assim; o cookie expira ou é revogado no próximo login
  }
  setToken(null)
  channel?.postMessage('logout')
}

// Logout feito em outra aba: esta também sai (o refresh token já foi revogado no servidor)
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('leadnexi-session')
channel?.addEventListener('message', (event) => {
  if (event.data === 'logout') setToken(null)
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

export function useSessionStatus(): SessionStatus {
  return useSyncExternalStore(subscribe, () => status)
}
