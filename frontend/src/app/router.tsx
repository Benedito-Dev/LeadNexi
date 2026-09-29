import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/AppLayout.tsx'
import { KanbanPage } from '../pages/KanbanPage.tsx'
import { LeadsPage } from '../pages/LeadsPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/kanban" replace /> },
      { path: '/kanban', element: <KanbanPage /> },
      { path: '/leads', element: <LeadsPage /> },
    ],
  },
])
