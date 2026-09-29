import { getToken, refreshSession } from './session.ts'

// Erro HTTP da API, com a mensagem enviada pelo backend (NestJS).
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Cliente HTTP base. O Vite faz proxy de /api para o backend (localhost:3000).
// Access token vencido (401): renova a sessão pelo cookie e repete a chamada uma vez.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init, getToken())

  // Rotas de /auth tratam o próprio 401 (ex.: senha errada no login)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession()
    if (refreshed === 'error') throw new ApiError(0, 'Não foi possível conectar ao servidor.')
    // Sem sessão: refreshSession já limpou o token; as rotas protegidas levam ao login
    if (refreshed !== 'unauthenticated') res = await send(path, init, refreshed.token)
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function send(path: string, init: RequestInit | undefined, token: string | null) {
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      // Com FormData (upload de arquivo) o navegador define o Content-Type com o boundary
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) return body.message.join('\n')
    if (body.message) return body.message
  } catch {
    // Corpo vazio ou não-JSON (ex.: proxy sem backend)
  }
  return `Erro ${res.status}`
}
