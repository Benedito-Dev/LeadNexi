import { CalendarCheck, LogOut, Moon, Sun, Users } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { NavLink } from 'react-router'
import { InstagramIcon, KanbanIcon } from '../brand/icons.tsx'
import { useLogout, useMe } from '../features/auth/hooks.ts'
import { useFollowUps } from '../features/leads/hooks.ts'
import { followUpTone } from '../lib/format.ts'
import { setTheme, useTheme } from '../lib/theme.ts'

type NavIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

const NAV_ITEMS: { to: string; label: string; icon: NavIcon }[] = [
  { to: '/hoje', label: 'Hoje', icon: CalendarCheck },
  { to: '/kanban', label: 'Funil', icon: KanbanIcon },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/instagram', label: 'Instagram', icon: InstagramIcon },
]

// Conteúdo da sidebar (BRAND.md, seções 8 e 9.1), usado no desktop e no menu do celular.
export function Sidebar({ header, onNavigate }: { header: ReactNode; onNavigate?: () => void }) {
  // Contatos atrasados ou de hoje: contador no item "Hoje"
  const followUps = useFollowUps()
  const pending = (followUps.data ?? []).filter(
    (lead) => lead.followUpAt && followUpTone(lead.followUpAt) !== 'future',
  ).length

  return (
    <div className="flex h-full flex-col px-4 py-6">
      {/* Recuo que alinha o logo com os ícones do menu */}
      <div className="pl-2">{header}</div>

      <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-11 items-center gap-3 rounded-sm px-3 text-ui transition-colors ${
                isActive ? 'bg-navy-active font-bold text-white' : 'text-slate-300 hover:bg-navy-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  className={isActive ? 'text-cyan' : 'text-slate-300'}
                />
                {label}
                {to === '/hoje' && pending > 0 && (
                  <span className="ml-auto rounded-full bg-cyan-tint px-2 py-0.5 text-xs leading-4 font-bold text-cyan tabular-nums">
                    <span className="sr-only">Pendentes: </span>
                    {pending}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <UserCard />
    </div>
  )
}

function UserCard() {
  const { data: user } = useMe()
  const logout = useLogout()
  if (!user) return null

  return (
    <div className="mt-auto flex items-center gap-3 border-t border-slate-tint pt-4">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-deep text-small font-extrabold text-violet-300"
      >
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ui font-bold text-white">{user.name}</p>
        <p className="truncate text-small font-medium text-slate-400">{user.email}</p>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={logout}
        aria-label="Sair"
        title="Sair"
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
      >
        <LogOut aria-hidden size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}

/** Alterna entre tema escuro e claro; o ícone mostra o tema para onde vai. */
function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? 'Usar tema claro' : 'Usar tema escuro'
  const Icon = next === 'light' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="-mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
    >
      <Icon aria-hidden size={18} strokeWidth={1.75} />
    </button>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
