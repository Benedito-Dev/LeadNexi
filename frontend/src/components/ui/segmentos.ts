import { cn } from '@/lib/utils'

/** Barra que agrupa as opções (ex.: "Próximo contato" do quadro, pipelines em Pipelines). */
export const barraDeSegmentos = 'inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-input bg-background p-0.5'

/** Uma opção da barra: a escolhida em violeta, as outras só texto. */
export const segmento = (ativo: boolean) =>
  cn(
    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60',
    ativo ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  )
