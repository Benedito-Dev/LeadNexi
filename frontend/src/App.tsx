import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/contexto'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { CrmPage } from '@/features/crm/CrmPage'
import { PipelinesPage } from '@/features/crm/PipelinesPage'
import { LoginPage } from '@/pages/LoginPage'

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
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/crm/pipelines" element={<PipelinesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}
