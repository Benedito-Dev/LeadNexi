import { NavLink, Outlet } from 'react-router'
import { useLogout } from '../features/auth/hooks.ts'

export function AppLayout() {
  const logout = useLogout()

  return (
    <div className="layout">
      <aside className="sidebar">
        <strong>LeadNexi</strong>
        <nav>
          <NavLink to="/kanban">Kanban</NavLink>
          <NavLink to="/leads">Leads</NavLink>
        </nav>
        <button type="button" onClick={logout} className="cursor-pointer text-left">
          Sair
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
