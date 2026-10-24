import { createContext, useContext } from 'react'
import type { Sessao } from '@/lib/api'

export type Usuario = Sessao['user']

type ValorAuth = {
  user: Usuario | null
  carregando: boolean
  /** Confere e-mail e senha. Não abre a sessão: quem chama decide quando (ex.: fim da animação). */
  conferir: (email: string, senha: string) => Promise<Sessao>
  /** Abre a sessão com a resposta do login: o app aparece (as rotas protegidas liberam). */
  abrirSessao: (sessao: Sessao) => void
  sair: () => Promise<void>
}

export const AuthContexto = createContext<ValorAuth | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContexto)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
