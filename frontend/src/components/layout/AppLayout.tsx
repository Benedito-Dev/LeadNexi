import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_WIDTH = 256
const SIDEBAR_COLLAPSED_WIDTH = 64

/** Casca do Rizar: sidebar fixa (recolhível) no desktop, gaveta no celular e topo. */
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <div className="bg-background min-h-screen">
      {!isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 border-0 [&>button]:text-sidebar-foreground [&>button]:opacity-70 [&>button]:hover:opacity-100"
          >
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <SheetDescription className="sr-only">Menu lateral do LeadNexi</SheetDescription>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {isDesktop && (
        <aside
          className="fixed inset-y-0 left-0 z-50 transition-all duration-200"
          style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        >
          <AppSidebar collapsed={collapsed} />
        </aside>
      )}

      <div
        className="flex flex-col transition-all duration-200 min-h-screen"
        style={{ marginLeft: isDesktop ? (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH) : 0 }}
      >
        <AppHeader
          onMenuClick={() => setMobileOpen(true)}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          sidebarCollapsed={collapsed}
        />

        {/* Sem a trilha "Voltar | casa > tela": o menu lateral já mostra onde você está */}
        <div className="flex-1 min-h-0 px-4 md:px-6 lg:px-8 pt-4 pb-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
