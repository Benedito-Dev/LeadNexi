import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getResultsDashboard, updateProspectingSettings } from './api.ts'
import type { ProspectingSettings } from './types.ts'

export const resultKeys = { all: ['results'] as const }

export function useResultsDashboard() {
  return useQuery({ queryKey: resultKeys.all, queryFn: getResultsDashboard, refetchInterval: 60_000 })
}

export function useUpdateProspectingSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ProspectingSettings, 'id'>) => updateProspectingSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resultKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['leads', 'today'] })
    },
  })
}
