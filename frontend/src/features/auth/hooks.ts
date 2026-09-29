import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endSession, setToken, useToken } from '../../lib/session.ts'
import { getMe, login } from './api.ts'
import type { LoginResponse } from './types.ts'

const meKey = ['auth', 'me'] as const

export function useMe() {
  const token = useToken()
  return useQuery({
    queryKey: meKey,
    queryFn: getMe,
    enabled: token !== null,
    staleTime: Infinity,
  })
}

/** Confere e-mail e senha. Não abre a sessão sozinho: quem chama decide quando (ex.: fim da animação). */
export function useLogin() {
  return useMutation({ mutationFn: login })
}

/** Abre a sessão com a resposta do login: o app aparece (as rotas protegidas liberam). */
export function useStartSession() {
  const queryClient = useQueryClient()
  return ({ accessToken, user }: LoginResponse) => {
    // Usuário no cache antes do token: as rotas protegidas abrem sem piscar
    queryClient.setQueryData(meKey, user)
    setToken(accessToken)
  }
}

/** Sair: revoga a sessão no servidor (o refresh token para de valer) e limpa o cache. */
export function useLogout() {
  const queryClient = useQueryClient()
  return async () => {
    await endSession()
    queryClient.clear()
  }
}
