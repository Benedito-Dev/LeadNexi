import { Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { cn } from '@/lib/utils'

const SUB_ABAS = [
  { rotulo: 'Perfil', para: '/configuracoes/perfil' },
  { rotulo: 'Canais', para: '/configuracoes/canais' },
  { rotulo: 'Prospecção', para: '/configuracoes/prospeccao' },
  { rotulo: 'IA e Claude', para: '/configuracoes/ia' },
]

/** Configurações: sub-abas à esquerda (no celular, em cima) e a sub-aba aberta ao lado. */
export function ConfiguracoesLayout() {
  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Configurações · LeadNexi</title>
      <ListPageHeader icon={Settings} title="Configurações" summary="Canais, prospecção, IA e seu perfil" />
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <nav aria-label="Configurações" className="flex gap-1 overflow-x-auto md:w-52 md:shrink-0 md:flex-col">
          {SUB_ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-accent font-bold text-foreground' : 'font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 max-w-3xl flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
