import { NavLink, Outlet } from 'react-router'

export function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <strong>LeadNexi</strong>
        <nav>
          <NavLink to="/kanban">Kanban</NavLink>
          <NavLink to="/leads">Leads</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
