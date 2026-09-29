import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { ApiError } from '../lib/api.ts'
import { router } from './router.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Erros 4xx (ex.: sessão expirada) não se resolvem tentando de novo
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
