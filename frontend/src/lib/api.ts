import { getToken, setToken } from './session.ts'

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
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    // Token expirado ou inválido: encerra a sessão; as rotas protegidas levam ao login
    if (res.status === 401 && token && getToken() === token) setToken(null)
    throw new ApiError(res.status, await readErrorMessage(res))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
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
