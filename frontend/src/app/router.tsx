import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/AppLayout.tsx'
import { RequireAuth } from '../features/auth/RequireAuth.tsx'
import { InstagramPage } from '../pages/InstagramPage.tsx'
import { KanbanPage } from '../pages/KanbanPage.tsx'
import { LeadsPage } from '../pages/LeadsPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { TodayPage } from '../pages/TodayPage.tsx'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/hoje" replace /> },
          { path: '/hoje', element: <TodayPage /> },
          { path: '/kanban', element: <KanbanPage /> },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/instagram', element: <InstagramPage /> },
        ],
      },
    ],
  },
  // Qualquer outro endereço: 404 própria (fora do login, abre mesmo sem sessão)
  { path: '*', element: <NotFoundPage /> },
])
