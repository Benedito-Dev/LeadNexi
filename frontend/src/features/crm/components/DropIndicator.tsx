import { cn } from '@/lib/utils'

/** Linha com pontas redondas que mostra onde o card vai cair, entre dois cards. */
export function DropIndicator({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <div className={cn('relative h-0.5 bg-primary rounded-full mx-1', edge === 'top' ? '-mt-1 mb-1' : 'mt-1 -mb-1')}>
      <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
    </div>
  )
}
