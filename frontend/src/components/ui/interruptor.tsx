import { cn } from '@/lib/utils'

/** Chave liga/desliga (violeta ligada). */
export function Interruptor({ ligado, rotulo, onMudar }: { ligado: boolean; rotulo: string; onMudar: (ligado: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan focus-visible:ring-offset-2',
        ligado ? 'border-leadnexi-violet-600 bg-leadnexi-violet-600' : 'border-input bg-muted',
      )}
    >
      <span aria-hidden className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', ligado ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}
