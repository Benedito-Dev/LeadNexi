import { Bot, Cable, Settings, SlidersHorizontal, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { cn } from '@/lib/utils'

const SUB_ABAS = [
  { rotulo: 'Perfil', para: '/configuracoes/perfil', Icone: UserRound },
  { rotulo: 'Canais', para: '/configuracoes/canais', Icone: Cable },
  { rotulo: 'Prospecção', para: '/configuracoes/prospeccao', Icone: SlidersHorizontal },
  { rotulo: 'IA e Claude', para: '/configuracoes/ia', Icone: Bot },
]

/** Configurações: sub-abas à esquerda (no celular, em cima) e a sub-aba aberta ao lado. */
export function ConfiguracoesLayout() {
  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Configurações · LeadNexi</title>
      <ListPageHeader icon={Settings} title="Configurações" summary="Canais, prospecção, IA e seu perfil" />
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <nav aria-label="Configurações" className="flex gap-1 overflow-x-auto md:w-56 md:shrink-0 md:flex-col">
          {SUB_ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm no-underline transition-colors',
                  isActive
                    ? 'bg-card font-bold text-foreground shadow-sm ring-1 ring-border'
                    : 'font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r bg-leadnexi-violet md:block" />}
                  <aba.Icone aria-hidden className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-leadnexi-violet-texto' : '')} strokeWidth={1.75} />
                  {aba.rotulo}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
