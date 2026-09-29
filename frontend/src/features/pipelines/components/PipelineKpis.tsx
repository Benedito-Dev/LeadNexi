import type { ReactNode } from 'react'
import { formatCurrency, formatPercent } from '../../../lib/format.ts'
import { computeKpis } from '../board.ts'
import type { PipelineBoard } from '../types.ts'

// Faixa de KPIs do funil (BRAND.md, seção 8 · "Faixa de KPIs"): uma superfície só,
// divisórias de 1px, valor Geist Mono 20 e barra de conversão com o gradiente da marca.
export function PipelineKpis({ board }: { board: PipelineBoard }) {
  const kpis = computeKpis(board)
  const closedStage = board.stages.at(-1)?.name ?? 'Fechado'

  return (
    // gap-px sobre fundo Navy 700 desenha as divisórias em qualquer quebra de grade
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-navy-700 xl:grid-cols-4">
      <Kpi label="Leads no funil" value={String(kpis.totalLeads)} />
      <Kpi label="Em negociação" value={formatCurrency(kpis.openValue)} />
      <Kpi
        label="Taxa de conversão"
        value={kpis.conversionRate === null ? '—' : formatPercent(kpis.conversionRate)}
      >
        <div
          role="progressbar"
          aria-label={`Leads que chegaram em ${closedStage}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((kpis.conversionRate ?? 0) * 100)}
          className="mt-2.5 h-0.75 overflow-hidden rounded-full bg-slate-tint"
        >
          <div
            className="h-full rounded-full bg-flow transition-[width] duration-300"
            style={{ width: `${(kpis.conversionRate ?? 0) * 100}%` }}
          />
        </div>
      </Kpi>
      <Kpi label={closedStage} value={formatCurrency(kpis.closedValue)} highlight />
    </dl>
  )
}

function Kpi({
  label,
  value,
  highlight = false,
  children,
}: {
  label: string
  value: string
  highlight?: boolean
  children?: ReactNode
}) {
  return (
    <div className="min-w-0 bg-navy-750 px-5 py-3.5">
      <dt className="text-small text-slate-400">{label}</dt>
      <dd className={`mt-1 truncate font-mono text-kpi-sm ${highlight ? 'text-cyan' : 'text-white'}`}>{value}</dd>
      {children && <dd>{children}</dd>}
    </div>
  )
}
