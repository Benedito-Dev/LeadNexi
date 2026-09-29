import { Navigate, Outlet, useLocation } from 'react-router'
import { LeadNexiMark } from '../../brand/LeadNexiMark.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { bootstrapSession, useSessionStatus, useToken } from '../../lib/session.ts'
import { useMe } from './hooks.ts'

// Rotas que exigem login: sem sessão, manda para /login e volta para cá depois de entrar.
export function RequireAuth() {
  const token = useToken()
  const sessionStatus = useSessionStatus()
  const location = useLocation()
  const me = useMe()

  // Restaurando a sessão pelo cookie: espera, sem mandar para o login antes da hora
  if (sessionStatus === 'checking') return <div aria-busy="true" className="min-h-screen" />
  if (sessionStatus === 'offline') return <Offline onRetry={() => void bootstrapSession()} />
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  if (me.isPending) return <div aria-busy="true" className="min-h-screen" />
  if (me.isError) return <Offline retrying={me.isFetching} onRetry={() => void me.refetch()} />
  return <Outlet />
}

function Offline({ retrying = false, onRetry }: { retrying?: boolean; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <LeadNexiMark size={48} />
      <div>
        <h1 className="text-h2">Não foi possível conectar ao servidor</h1>
        <p className="mt-2 text-body text-slate-400">Verifique sua conexão e tente de novo.</p>
      </div>
      <Button variant="secondary" disabled={retrying} onClick={onRetry}>
        {retrying ? 'Tentando…' : 'Tentar de novo'}
      </Button>
    </main>
  )
}
