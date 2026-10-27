import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/contexto'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { ClientesPage } from '@/features/clientes/ClientesPage'
import { ConteudoPage } from '@/features/conteudo/ConteudoPage'
import { ConversasPage } from '@/features/conversas/ConversasPage'
import { CrmPage } from '@/features/crm/CrmPage'
import { PipelinesPage } from '@/features/crm/PipelinesPage'
import { HojePage } from '@/features/hoje/HojePage'
import { ResultadosPage } from '@/features/resultados/ResultadosPage'
import { CanaisPage } from '@/features/configuracoes/CanaisPage'
import { ConfiguracoesLayout } from '@/features/configuracoes/ConfiguracoesLayout'
import { IaPage } from '@/features/configuracoes/IaPage'
import { ListasPage } from '@/features/listas/ListasPage'
import { ProspeccaoPage } from '@/features/configuracoes/ProspeccaoPage'
import { CartaoEmBreve } from '@/pages/EmBreve'
import { TELAS_PLANEJADAS as T } from '@/pages/telasPlanejadas'
import { LoginPage } from '@/pages/LoginPage'

/** Leva a volta do login do Instagram para Configurações › Canais, mantendo o ?conectado / ?erro. */
function VoltaDoInstagram() {
  const { search } = useLocation()
  return <Navigate to={`/configuracoes/canais${search}`} replace />
}

/** Só deixa passar com sessão; enquanto restaura a sessão, mostra o fundo vazio. */
function RotaProtegida() {
  const { user, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <div className="min-h-screen bg-background" />
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route path="/hoje" element={<HojePage />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/crm/pipelines" element={<PipelinesPage />} />
              <Route path="/conversas" element={<ConversasPage />} />
              <Route path="/crm/listas" element={<ListasPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/conteudo" element={<ConteudoPage />} />
              <Route path="/resultados" element={<ResultadosPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesLayout />}>
                <Route index element={<Navigate to="canais" replace />} />
                <Route path="perfil" element={<CartaoEmBreve tela={T.perfil} />} />
                <Route path="canais" element={<CanaisPage />} />
                <Route path="prospeccao" element={<ProspeccaoPage />} />
                <Route path="ia" element={<IaPage />} />
              </Route>
              {/* A volta do login do Instagram (servidor) ainda aponta para /instagram?conectado=1 ou ?erro=... */}
              <Route path="/instagram" element={<VoltaDoInstagram />} />
            </Route>
          </Route>
          {/* A tela inicial é a Hoje: é o que o vendedor abre todo dia */}
          <Route path="*" element={<Navigate to="/hoje" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}
