import type { LucideIcon } from 'lucide-react'
import { Selo, type TomDoSelo } from '@/components/ui/selo'

/** Número do placar: selo, rótulo, o valor grande e, com meta, a barra de progresso. */
export function CartaoDeNumero({
  Icone,
  tom,
  rotulo,
  valor,
  detalhe,
  meta,
  atual,
}: {
  Icone: LucideIcon
  tom: TomDoSelo
  rotulo: string
  valor: string
  detalhe: string
  meta?: number
  /** Valor numérico para a barra (quando `valor` vem formatado). */
  atual?: number
}) {
  const progresso = meta ? Math.min(((atual ?? Number(valor)) / meta) * 100, 100) : null
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Selo Icone={Icone} tom={tom} />
        <span className="text-sm font-bold text-foreground">{rotulo}</span>
      </div>
      <span className="text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-foreground">{valor}</span>
      {progresso !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" title={`${Math.round(progresso)}% da meta`}>
          <span className="block h-full rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan" style={{ width: `${progresso}%` }} />
        </div>
      )}
      <span className="text-xs font-medium leading-5 text-muted-foreground">{detalhe}</span>
    </div>
  )
}
