import { AlarmClock, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SituacaoContato } from '../datas'

// Fundo em tom claro, borda fina e texto na cor cheia: vermelho = atrasou, ciano = é hoje,
// violeta = amanhã, neutro = mais pra frente
const TOM_DO_CONTATO = {
  atrasado: 'border-leadnexi-danger/40 bg-leadnexi-danger/10 text-leadnexi-danger',
  hoje: 'border-leadnexi-cyan-texto/40 bg-leadnexi-cyan-texto/10 text-leadnexi-cyan-texto',
  amanha: 'border-leadnexi-violet-texto/40 bg-leadnexi-violet-texto/10 text-leadnexi-violet-texto',
  futuro: 'border-border bg-transparent text-muted-foreground',
}

/** Etiqueta do próximo contato ("Atrasado 2 dias", "Hoje 15:00"...), no card e na ficha. */
export function EtiquetaContato({
  contato,
  comIcone = false,
  className,
}: {
  contato: SituacaoContato
  /** Ícone de calendário (ou de alarme, quando atrasou) antes do texto. */
  comIcone?: boolean
  className?: string
}) {
  const Icone = contato.tom === 'atrasado' ? AlarmClock : CalendarClock
  return (
    <span
      className={cn('shrink-0 rounded-md border px-1.5 py-0.5 font-semibold tabular-nums', TOM_DO_CONTATO[contato.tom], className)}
      title="Próximo contato"
    >
      {comIcone && <Icone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
      {contato.texto}
    </span>
  )
}
