import { useState, type ComponentType } from 'react'
import { CalendarCheck, ChevronDown, LogOut, Users } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/contexto'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ItemDeMenu = {
  title: string
  icon: ComponentType<{ className?: string }>
  /** Item simples (vai direto para a tela) ou grupo com sub-itens. */
  to?: string
  children?: { title: string; to: string }[]
}

// Mesma estrutura do menu do Rizar: itens simples e grupos com sub-itens.
const MENU: ItemDeMenu[] = [
  { title: 'Hoje', icon: CalendarCheck, to: '/hoje' },
  {
    title: 'CRM',
    icon: Users,
    children: [
      { title: 'Leads', to: '/crm' },
      { title: 'Pipelines', to: '/crm/pipelines' },
    ],
  },
]

const ACTIVE_BOX = 'bg-[hsl(var(--sidebar-accent))] shadow-sm text-[hsl(var(--sidebar-foreground))] font-semibold'
const INACTIVE_BOX =
  'bg-transparent text-[hsl(var(--sidebar-foreground))] font-medium hover:bg-[hsl(var(--sidebar-accent))]/50'

function ActiveBar() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-sidebar-highlight"
    />
  )
}

function NavItem({
  item,
  currentPath,
  onNavigate,
  collapsed,
}: {
  item: ItemDeMenu & { to: string }
  currentPath: string
  onNavigate: (to: string) => void
  collapsed: boolean
}) {
  const ativo = currentPath === item.to
  const Icon = item.icon
  const botao = (
    <button
      onClick={() => onNavigate(item.to)}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md border-0 px-3 py-2 text-sm transition-colors',
        ativo ? ACTIVE_BOX : INACTIVE_BOX,
      )}
    >
      {ativo && <ActiveBar />}
      <Icon className={cn('h-5 w-5 shrink-0', ativo ? 'text-sidebar-highlight' : 'text-[hsl(var(--sidebar-foreground))]')} />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </button>
  )
  if (!collapsed) return botao
  return (
    <Tooltip>
      <TooltipTrigger asChild>{botao}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  )
}

function NavDropdown({
  item,
  currentPath,
  onNavigate,
  collapsed,
}: {
  item: ItemDeMenu
  currentPath: string
  onNavigate: (to: string) => void
  collapsed: boolean
}) {
  const filhos = item.children ?? []
  const indiceAtivo = filhos.findIndex((c) => c.to === currentPath)
  const hasActive = indiceAtivo !== -1
  const [open, setOpen] = useState(hasActive)
  const Icon = item.icon

  const trigger = (
    <button
      onClick={() => (collapsed ? onNavigate(filhos[0].to) : setOpen(!open))}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md border-0 px-3 py-2 text-sm transition-colors',
        hasActive ? ACTIVE_BOX : INACTIVE_BOX,
      )}
    >
      {hasActive && <ActiveBar />}
      <Icon className={cn('h-5 w-5 shrink-0', hasActive ? 'text-sidebar-highlight' : 'text-[hsl(var(--sidebar-foreground))]')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.title}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </>
      )}
    </button>
  )

  return (
    <div>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      {open && !collapsed && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-[hsl(var(--sidebar-border))] pl-3">
          {filhos.map((child, i) => (
            <button
              key={child.to}
              onClick={() => onNavigate(child.to)}
              className={cn(
                'flex w-full items-center rounded-md border-0 px-3 py-1.5 text-sm transition-colors',
                i === indiceAtivo
                  ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold'
                  : 'bg-transparent text-[hsl(var(--sidebar-foreground))]/70 font-medium hover:text-[hsl(var(--sidebar-foreground))]',
              )}
            >
              {child.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user, sair } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const irPara = (to: string) => {
    navigate(to)
    onNavigate?.()
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border-color))]">
        {/* Logo do LeadNexi no lugar do logo do Rizar (a marca é do produto) */}
        <div className="border-b border-[hsl(var(--sidebar-fg)/0.1)] flex justify-center px-4 py-5">
          <button
            type="button"
            onClick={() => irPara('/hoje')}
            aria-label="Ir para o início"
            className="flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-highlight"
          >
            {collapsed ? (
              <img src="/brand/symbol-on-dark.svg" alt="LeadNexi" className="h-8 w-8" />
            ) : (
              <img src="/brand/logo-horizontal-on-dark.svg" alt="LeadNexi" className="h-8" />
            )}
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          <div className="space-y-0.5">
            {MENU.map((item) =>
              item.to ? (
                <NavItem key={item.title} item={{ ...item, to: item.to }} currentPath={pathname} onNavigate={irPara} collapsed={collapsed} />
              ) : (
                <NavDropdown key={item.title} item={item} currentPath={pathname} onNavigate={irPara} collapsed={collapsed} />
              ),
            )}
          </div>
        </div>

        <div className="border-t border-[hsl(var(--sidebar-border))] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-highlight text-xs font-semibold text-sidebar-highlight-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-[hsl(var(--sidebar-foreground))]">{user?.name || 'Usuário'}</span>
                <span className="truncate text-xs text-[hsl(var(--sidebar-foreground))]/60">{user?.email}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void sair()}
              aria-label="Sair"
              className="h-8 w-8 shrink-0 text-[hsl(var(--sidebar-foreground))]/60 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
