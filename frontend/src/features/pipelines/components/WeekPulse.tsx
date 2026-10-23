import { CalendarCheck, MessageCircle, Target, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '../../../lib/format.ts'
import { useTodayDashboard } from '../../leads/hooks.ts'

/**
 * Placar da semana no topo do funil: o quanto você andou, não o quanto falta (princípio do progresso).
 * A barra de contatos (gradiente `bg-flow`, 4 px) cresce rumo à meta semanal e a frase muda conforme
 * você se aproxima dela (efeito do gradiente de meta). Zeros ficam em `slate-400`, sem destaque: o que
 * ainda não aconteceu não grita. Mesmos números da tela Hoje (`GET /leads/today`).
 */
export function WeekPulse() {
  const dashboard = useTodayDashboard()
  if (dashboard.isPending) return <div aria-busy="true" aria-label="Carregando placar da semana" className="h-22 animate-pulse rounded-lg border bg-navy-800" />
  if (dashboard.isError || !dashboard.data) return null

  const data = dashboard.data
  const target = Math.max(1, data.weeklyTarget)
  const done = data.contactsMade
  const progress = Math.min(1, done / target)
  const remaining = Math.max(0, target - done)
  const closedValue = Number(data.closedThisMonth.value)

  return (
    <section aria-label="Placar da semana" className="flex flex-col gap-4 rounded-lg border bg-navy-800 px-4 py-3.5 md:flex-row md:items-center md:gap-8">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-small text-slate-400">Esta semana</p>
          <p className={`truncate text-xs font-bold ${remaining === 0 ? 'text-success' : 'text-slate-300'}`}>{momentum(done, remaining, target)}</p>
        </div>
        <p className="mt-0.5 text-white">
          <span className="text-h2 font-bold tabular-nums">{done}</span>
          <span className="text-ui font-bold text-slate-400 tabular-nums"> / {target} contatos</span>
        </p>
        <div
          role="progressbar"
          aria-label="Contatos feitos na semana"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={done}
          className="mt-2 h-1 overflow-hidden rounded-full bg-slate-tint"
        >
          <span
            className="block h-full rounded-full bg-flow transition-[width] duration-500"
            // Um traço mínimo mesmo no zero: a barra "já começou"
            style={{ width: `${Math.max(progress, 0.015) * 100}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 md:flex md:gap-6">
        <Stat icon={MessageCircle} tone="text-cyan" label="Respostas" value={data.responsesThisWeek} />
        <Stat icon={CalendarCheck} tone="text-violet-300" label="Reuniões" value={data.meetingsThisWeek} />
        {closedValue > 0 ? (
          <Stat icon={Target} tone="text-success" label="Fechado no mês" value={formatCurrency(closedValue)} highlight />
        ) : (
          <Stat icon={Target} tone="text-slate-400" label="Meta do mês" value={formatCurrency(data.monthlyGoal)} muted />
        )}
      </dl>
    </section>
  )
}

/** Frase do placar: começa convidando, depois mostra o caminho que falta, e comemora a meta. */
function momentum(done: number, remaining: number, target: number): string {
  if (remaining === 0) return 'Meta da semana batida'
  if (done === 0) return 'A primeira mensagem abre a semana'
  if (done / target >= 0.75) return `Reta final: faltam ${remaining}`
  if (done / target >= 0.5) return `Passou da metade · faltam ${remaining}`
  return `Faltam ${remaining} para a meta`
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  highlight = false,
  muted = false,
}: {
  icon: LucideIcon
  tone: string
  label: string
  value: number | string
  highlight?: boolean
  muted?: boolean
}) {
  const zero = value === 0
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
        <Icon aria-hidden size={13} strokeWidth={1.75} className={`shrink-0 ${tone}`} />
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-ui font-bold tabular-nums md:text-lg ${
          highlight ? 'text-success' : zero || muted ? 'text-slate-400' : 'text-white'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
