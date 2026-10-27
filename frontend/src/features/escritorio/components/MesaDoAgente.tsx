import { BarChart3, Check, Clapperboard, Mail, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agente } from '../api'
import { estadoDoAgente, type Estado } from '../estado'
import { PixelRobo } from './PixelRobo'

/** O que aparece na tela do monitor de cada um. */
const ICONE_DA_TELA: Record<string, LucideIcon> = { criador: Clapperboard, estrategista: BarChart3, prospector: Mail }

/** Balão acima da cabeça: o estado sem precisar ler. */
function Balao({ estado }: { estado: Estado }) {
  const base = 'absolute -top-7 left-1/2 flex h-6 min-w-9 -translate-x-1/2 items-center justify-center gap-0.5 border-2 px-1.5 font-mono text-xs font-bold'
  if (estado === 'trabalhando') {
    return (
      <span className={cn(base, 'border-leadnexi-cyan bg-card text-leadnexi-cyan-texto')}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="lnx-pontinho h-1 w-1 bg-current" />
        ))}
      </span>
    )
  }
  if (estado === 'terminou') {
    return (
      <span className={cn(base, 'border-success-foreground bg-card text-success-foreground')}>
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    )
  }
  if (estado === 'falhou') return <span className={cn(base, 'border-leadnexi-danger bg-card text-leadnexi-danger')}>!</span>
  return (
    <span className="absolute -top-9 left-[62%] h-8 w-8 font-mono font-bold text-muted-foreground">
      <span className="lnx-zzz absolute bottom-0 left-0 text-lg">z</span>
      <span className="lnx-zzz absolute bottom-0 left-0 text-sm">z</span>
    </span>
  )
}

/** Uma estação de trabalho: balão, robô, mesa com monitor e a plaquinha com o nome. */
export function MesaDoAgente({ agente, selecionado, onSelecionar }: { agente: Agente; selecionado: boolean; onSelecionar: () => void }) {
  const estado = estadoDoAgente(agente)
  const Tela = ICONE_DA_TELA[agente.character] ?? Clapperboard
  const ligado = estado !== 'dormindo'

  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-pressed={selecionado}
      aria-label={`${agente.name}: ${estado}`}
      className="group flex flex-col items-center outline-none"
    >
      <div className="relative">
        <Balao estado={estado} />
        <div className={estado === 'trabalhando' ? 'lnx-robo-digita' : estado === 'dormindo' ? undefined : 'lnx-robo-respira'}>
          <PixelRobo personagem={agente.character} estado={estado} pixel={7} />
        </div>
      </div>
      {/* Mesa: tampo e frente em blocos retos, com o monitor em cima, à direita */}
      <div className="relative -mt-6 w-60">
        <div className="absolute -top-12 right-1 flex flex-col items-center">
          <div
            className={cn(
              'grid h-11 w-14 place-items-center border-[3px] border-[hsl(var(--sidebar-bg))]',
              ligado ? 'bg-leadnexi-cyan/25' : 'bg-[hsl(var(--sidebar-bg))]',
              estado === 'trabalhando' && 'lnx-tela',
            )}
          >
            <Tela aria-hidden className={cn('h-5 w-5', ligado ? 'text-leadnexi-cyan-texto' : 'text-muted-foreground/40')} strokeWidth={2} />
          </div>
          <div className="h-1.5 w-2 bg-[hsl(var(--sidebar-bg))]" />
        </div>
        <div className="h-3 border-2 border-[hsl(var(--sidebar-bg))] bg-muted-foreground/40" />
        <div className="mx-4 flex h-8 justify-between border-x-2 border-b-2 border-[hsl(var(--sidebar-bg))] bg-muted">
          {/* Gaveta */}
          <span className="ml-3 mt-2 h-2 w-8 border-2 border-[hsl(var(--sidebar-bg))]" />
        </div>
      </div>
      <span
        className={cn(
          'mt-3 border-2 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors',
          selecionado ? 'border-leadnexi-violet bg-leadnexi-violet/15 text-foreground' : 'border-border bg-card text-muted-foreground group-hover:text-foreground',
        )}
      >
        {agente.name}
      </span>
    </button>
  )
}
