import { Menu, X } from 'lucide-react'
import { useRef } from 'react'
import { Outlet } from 'react-router'
import { LeadNexiLogo } from '../brand/LeadNexiMark.tsx'
import { Sidebar } from './Sidebar.tsx'

// Estrutura do app (BRAND.md, seção 9.1): sidebar fixa de 248px no desktop;
// no celular, barra no topo e a mesma sidebar num menu lateral (<dialog>).
export function AppLayout() {
  const menuRef = useRef<HTMLDialogElement>(null)
  const openMenu = () => menuRef.current?.showModal()
  const closeMenu = () => menuRef.current?.close()

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
          className="grid size-10 cursor-pointer place-items-center rounded-sm text-slate-300 hover:bg-navy-800"
        >
          <Menu aria-hidden size={22} strokeWidth={1.75} />
        </button>
      </header>

      <dialog
        ref={menuRef}
        aria-label="Menu"
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

      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-7">
        <Outlet />
      </main>
    </div>
  )
}
