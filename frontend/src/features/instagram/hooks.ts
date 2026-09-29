import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { disconnectInstagram, getInstagramAccount, startInstagramConnect } from './api.ts'

export const instagramKeys = { account: ['instagram', 'account'] as const }

export function useInstagramAccount() {
  return useQuery({ queryKey: instagramKeys.account, queryFn: getInstagramAccount })
}

/** Pede o link de login e leva o navegador até o Instagram. */
export function useConnectInstagram() {
  return useMutation({
    mutationFn: startInstagramConnect,
    onSuccess: ({ url }) => window.location.assign(url),
  })
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnectInstagram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: instagramKeys.account }),
  })
}
