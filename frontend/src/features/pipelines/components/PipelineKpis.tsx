import { formatCurrency, formatPercent } from '../../../lib/format.ts'
import { computeKpis } from '../board.ts'
import type { PipelineBoard } from '../types.ts'

// Resumo do funil (BRAND.md, seção 8 · "Resumo do funil"): números soltos, sem superfície.
// Rótulo acima, valor Manrope 20/700 com algarismos tabulares; fechado em cyan.
export function PipelineKpis({ board }: { board: PipelineBoard }) {
  const kpis = computeKpis(board)
  const closedStage = board.stages.at(-1)?.name ?? 'Fechado'

  return (
    <dl className="grid grid-cols-2 gap-x-12 gap-y-4 sm:flex sm:flex-wrap">
      <Kpi label="Leads no funil" value={String(kpis.totalLeads)} />
      <Kpi label="Em negociação" value={formatCurrency(kpis.openValue)} />
      <Kpi
        label="Taxa de conversão"
        value={kpis.conversionRate === null ? '—' : formatPercent(kpis.conversionRate)}
      />
      <Kpi label={closedStage} value={formatCurrency(kpis.closedValue)} highlight />
    </dl>
  )
}

function Kpi({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-slate-400">{label}</dt>
      <dd className={`mt-0.5 truncate text-kpi-sm tabular-nums ${highlight ? 'text-cyan' : 'text-white'}`}>{value}</dd>
    </div>
  )
}
