import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Cor de cada sinal: violeta (ação), ciano (ritmo), verde (dinheiro), âmbar (alerta). */
const TONS = {
  violeta: 'bg-leadnexi-violet/15 text-leadnexi-violet-texto',
  ciano: 'bg-leadnexi-cyan/15 text-leadnexi-cyan-texto',
  verde: 'bg-success text-success-foreground',
  ambar: 'bg-warn-foreground/15 text-warn-foreground',
}

export type TomDoSelo = keyof typeof TONS

/** Ícone num quadrado arredondado com a cor do sinal (metas, placar). */
export function Selo({ Icone, tom, className }: { Icone: LucideIcon; tom: TomDoSelo; className?: string }) {
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', TONS[tom], className)}>
      <Icone aria-hidden className="h-5 w-5" strokeWidth={1.75} />
    </span>
  )
}
