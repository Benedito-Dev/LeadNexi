/**
 * Cliente HTTP da API (`/api`, mesmo domínio: o proxy do Vite em dev, a Vercel em produção).
 *
 * Sessão: o access token (JWT curto) fica só em memória; o refresh token mora num cookie
 * httpOnly que o navegador manda sozinho para `/api/auth`. Num 401, troca o refresh por um
 * access novo uma vez e repete a chamada.
 */

export class ErroDeApi extends Error {
  readonly status: number | null

  constructor(mensagem: string, status: number | null) {
    super(mensagem)
    this.name = 'ErroDeApi'
    this.status = status
  }
}

let accessToken: string | null = null
let aoPerderSessao: (() => void) | null = null
let renovando: Promise<Sessao | null> | null = null

export function definirAccessToken(token: string | null) {
  accessToken = token
}

/** Chamado quando a sessão acaba (refresh recusado): o app volta para o login. */
export function aoExpirarSessao(callback: () => void) {
  aoPerderSessao = callback
}

export type Sessao = { accessToken: string; user: { id: string; email: string; name: string } }

/** Troca o cookie de refresh por um access token novo. Chamadas simultâneas dividem a mesma troca. */
export function renovarSessao(): Promise<Sessao | null> {
  // Duas trocas ao mesmo tempo mandariam o mesmo refresh duas vezes, e o servidor trata refresh
  // reapresentado como roubo (encerra a sessão). Ex.: o StrictMode roda o efeito de início duas vezes.
  if (renovando) return renovando
  renovando = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null
      const sessao = (await res.json()) as Sessao
      accessToken = sessao.accessToken
      return sessao
    })
    .finally(() => {
      renovando = null
    })
  return renovando
}

async function mensagemDoErro(res: Response) {
  try {
    const corpo = await res.json()
    const msg = Array.isArray(corpo?.message) ? corpo.message[0] : corpo?.message
    if (typeof msg === 'string' && msg) return msg
  } catch {
    // Corpo sem JSON: fica a mensagem genérica
  }
  return `O servidor recusou o pedido (erro ${res.status}).`
}

async function chamar(caminho: string, init: RequestInit, jaRenovou = false): Promise<Response> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`/api${caminho}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new ErroDeApi('Não foi possível falar com o servidor.', null)
  }

  if (res.status === 401 && !jaRenovou) {
    const sessao = await renovarSessao().catch(() => null)
    if (sessao) return chamar(caminho, init, true)
    accessToken = null
    aoPerderSessao?.()
  }
  return res
}

export async function api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const res = await chamar(caminho, init)
  if (!res.ok) throw new ErroDeApi(await mensagemDoErro(res), res.status)
  if (res.status === 204) return undefined as T
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

export const corpo = (dados: unknown) => JSON.stringify(dados)
