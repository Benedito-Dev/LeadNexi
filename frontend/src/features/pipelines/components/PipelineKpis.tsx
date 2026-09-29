import type { ReactNode } from 'react'
import { formatCurrency, formatPercent } from '../../../lib/format.ts'
import { computeKpis, newLeadsPerDay, openValueByStage } from '../board.ts'
import type { PipelineBoard } from '../types.ts'

// Cards de KPI do funil (BRAND.md, seção 8 · "Cards de KPI"): compactos, com número e legenda à
// esquerda e um gráfico pequeno à direita. Valores em Manrope; fechado em verde (success).
export function PipelineKpis({ board }: { board: PipelineBoard }) {
  const kpis = computeKpis(board)
  const days = newLeadsPerDay(board, 14)
  const lastWeek = days.slice(-7).reduce((sum, day) => sum + day.count, 0)
  const closedStage = board.stages.at(-1)?.name ?? 'Fechado'
  const ticket = kpis.closedCount > 0 ? kpis.closedValue / kpis.closedCount : null

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Leads no funil"
        value={String(kpis.totalLeads)}
        caption={`${lastWeek} ${lastWeek === 1 ? 'novo' : 'novos'} em 7 dias`}
        chart={
          <MiniBars
            label="Leads criados por dia nos últimos 14 dias"
            bars={days.map((day, index) => ({
              key: day.label,
              value: day.count,
              title: `${day.label}: ${day.count} ${day.count === 1 ? 'lead' : 'leads'}`,
              accent: index === days.length - 1,
            }))}
          />
        }
      />

      <StatTile
        label="Em negociação"
        value={formatCurrency(kpis.openValue)}
        caption={`${kpis.openCount} ${kpis.openCount === 1 ? 'lead aberto' : 'leads abertos'}`}
        chart={
          <MiniBars
            label="Valor em aberto por etapa"
            bars={openValueByStage(board).map((stage) => ({
              key: stage.id,
              value: stage.value,
              title: `${stage.name}: ${formatCurrency(stage.value)}`,
              accent: true,
            }))}
          />
        }
      />

      <StatTile
        label="Taxa de conversão"
        value={kpis.conversionRate === null ? '—' : formatPercent(kpis.conversionRate)}
        caption={`${kpis.closedCount} de ${kpis.totalLeads} em ${closedStage}`}
        chart={<Ring ratio={kpis.conversionRate ?? 0} label={`Leads que chegaram em ${closedStage}`} />}
      />

      <StatTile
        label={closedStage}
        value={formatCurrency(kpis.closedValue)}
        highlight
        caption={ticket === null ? 'Nenhum negócio fechado' : `Ticket médio ${formatCurrency(ticket)}`}
      />
    </dl>
  )
}

function StatTile({
  label,
  value,
  caption,
  highlight = false,
  chart,
}: {
  label: string
  value: string
  caption: string
  highlight?: boolean
  chart?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-3 rounded-lg border bg-navy-800 px-4 py-3.5">
      <div className="min-w-0">
        <dt className="text-small text-slate-400">{label}</dt>
        <dd className={`mt-0.5 truncate text-h2 font-bold ${highlight ? 'text-success' : 'text-white'}`}>{value}</dd>
        <dd className="mt-1 truncate text-xs font-semibold text-slate-400">{caption}</dd>
      </div>
      {chart && <dd className="shrink-0 pb-1">{chart}</dd>}
    </div>
  )
}

/** Barrinhas verticais (uma série): discretas, com destaque em violeta. Dica nativa (title) em cada uma. */
function MiniBars({
  label,
  bars,
}: {
  label: string
  bars: { key: string; value: number; title: string; accent: boolean }[]
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  return (
    // Poucas barras (etapas) ficam mais espaçadas; muitas (dias) ficam finas
    <div
      role="img"
      aria-label={label}
      className={`flex h-9 items-end ${bars.length > 6 ? 'gap-0.5' : 'gap-1.5'}`}
      style={{ width: bars.length > 6 ? bars.length * 7 : 52 }}
    >
      {bars.map((bar) => (
        <div key={bar.key} title={bar.title} className="flex h-full flex-1 items-end">
          <div
            className={`w-full rounded-t-[2px] ${bar.value === 0 ? 'bg-slate-tint' : bar.accent ? 'bg-violet' : 'bg-navy-600'}`}
            style={{ height: bar.value === 0 ? 2 : `${Math.max(8, (bar.value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

/** Anel de progresso: trilha discreta, preenchimento violeta. */
function Ring({ ratio, label }: { ratio: number; label: string }) {
  const radius = 15
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="-rotate-90"
    >
      <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-slate-tint" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        className="stroke-violet transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}
