import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Selo, type TomDoSelo } from '@/components/ui/selo'
import { cn } from '@/lib/utils'

const porcento = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

/** Número do placar: selo, rótulo, o valor grande e, com meta, a barra de progresso. */
export function CartaoDeNumero({
  Icone,
  tom,
  rotulo,
  valor,
  detalhe,
  meta,
  atual,
  variacao,
}: {
  Icone: LucideIcon
  tom: TomDoSelo
  rotulo: string
  valor: string
  detalhe: string
  meta?: number
  /** Valor numérico para a barra (quando `valor` vem formatado). */
  atual?: number
  /** Mudança em relação ao período anterior (0,12 = 12% a mais); ao lado do valor. */
  variacao?: number | null
}) {
  const progresso = meta ? Math.min(((atual ?? Number(valor)) / meta) * 100, 100) : null
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Selo Icone={Icone} tom={tom} />
        <span className="text-sm font-bold text-foreground">{rotulo}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-foreground">{valor}</span>
        {variacao != null && <Variacao valor={variacao} />}
      </div>
      {progresso !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" title={`${Math.round(progresso)}% da meta`}>
          <span className="block h-full rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan" style={{ width: `${progresso}%` }} />
        </div>
      )}
      <span className="text-xs font-medium leading-5 text-muted-foreground">{detalhe}</span>
    </div>
  )
}

/** "+12%" em verde, "−8%" em vermelho, "0%" neutro. */
function Variacao({ valor }: { valor: number }) {
  const arredondado = Math.round(valor * 100)
  const Seta = arredondado > 0 ? ArrowUpRight : arredondado < 0 ? ArrowDownRight : null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-bold tabular-nums',
        arredondado > 0 ? 'text-success-foreground' : arredondado < 0 ? 'text-leadnexi-danger' : 'text-muted-foreground',
      )}
    >
      {Seta && <Seta aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
      {arredondado > 0 ? '+' : ''}
      {porcento.format(valor)}
    </span>
  )
}
