import { Home, Menu, Users, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LeadNexiLogo } from '../brand/LeadNexiMark.tsx'
import { KanbanIcon } from '../brand/icons.tsx'
import { Sidebar } from './Sidebar.tsx'

const MOBILE_NAV_ITEMS = [
  { to: '/hoje', label: 'Hoje', icon: Home },
  { to: '/kanban', label: 'Funil', icon: KanbanIcon },
  { to: '/leads', label: 'Leads', icon: Users },
] as const

// Estrutura do app (BRAND.md, seção 9.1): sidebar fixa de 248px no desktop;
// no celular, barra no topo e a mesma sidebar num menu lateral (<dialog>).
export function AppLayout() {
  const menuRef = useRef<HTMLDialogElement>(null)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const openMenu = () => {
    menuRef.current?.showModal()
    setMenuOpen(true)
  }
  const closeMenu = () => {
    menuRef.current?.close()
    setMenuOpen(false)
  }

  return (
    <div className="lg:flex">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-violet-600 px-4 py-2 text-ui font-bold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 border-r border-slate-tint bg-navy-900 lg:block">
        <Sidebar header={<LeadNexiLogo size={30} />} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-tint bg-navy-900 px-4 lg:hidden">
        <LeadNexiLogo size={28} />
        <button
          type="button"
          onClick={openMenu}
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="grid size-10 cursor-pointer place-items-center rounded-sm text-slate-300 hover:bg-navy-800"
        >
          <Menu aria-hidden size={22} strokeWidth={1.75} />
        </button>
      </header>

      <dialog
        ref={menuRef}
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        // Clique fora do painel (no fundo escurecido) fecha o menu
        onClick={(event) => event.target === event.currentTarget && closeMenu()}
        className="m-0 h-dvh max-h-none w-62 max-w-[85vw] border-r border-slate-tint bg-navy-900 p-0 text-white backdrop:bg-backdrop"
      >
        <Sidebar
          onNavigate={closeMenu}
          header={
            <div className="flex items-center justify-between">
              <LeadNexiLogo size={28} />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                className="grid size-10 cursor-pointer place-items-center rounded-sm text-slate-300 hover:bg-navy-800"
              >
                <X aria-hidden size={22} strokeWidth={1.75} />
              </button>
            </div>
          }
        />
      </dialog>

      <main id="conteudo" tabIndex={-1} className="app-content min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-7">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-tint bg-navy-900/95 px-2 pt-1 backdrop-blur lg:hidden" aria-label="Navegação mobile">
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold transition-colors ${isActive ? 'text-cyan' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {({ isActive }) => <><Icon aria-hidden size={20} strokeWidth={isActive ? 2.1 : 1.75} /><span>{label}</span></>}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={openMenu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold transition-colors ${location.pathname === '/resultados' || location.pathname.startsWith('/instagram') || location.pathname.startsWith('/leads/importar') ? 'text-cyan' : 'text-slate-400 hover:text-slate-300'}`}
        >
          <Menu aria-hidden size={20} strokeWidth={1.75} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  )
}
