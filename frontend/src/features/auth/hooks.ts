import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setToken, useToken } from '../../lib/session.ts'
import { getMe, login } from './api.ts'

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

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken, user }) => {
      // Usuário no cache antes do token: as rotas protegidas abrem sem piscar
      queryClient.setQueryData(meKey, user)
      setToken(accessToken)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return () => {
    setToken(null)
    queryClient.clear()
  }
}
