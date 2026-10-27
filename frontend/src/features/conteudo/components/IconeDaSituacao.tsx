import { CalendarClock, CircleAlert, CircleCheck, CircleOff, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SituacaoDoPost } from '../tipos'

/** Ícone da situação: agendado, publicando (girando), publicado, falhou, removido. */
export function IconeDaSituacao({ situacao, className }: { situacao: SituacaoDoPost; className?: string }) {
  const props = { 'aria-hidden': true, strokeWidth: 1.75, className: cn('h-3.5 w-3.5 shrink-0', className) } as const
  if (situacao === 'PUBLISHING') return <LoaderCircle {...props} className={cn(props.className, 'animate-spin')} />
  if (situacao === 'PUBLISHED') return <CircleCheck {...props} />
  if (situacao === 'FAILED') return <CircleAlert {...props} />
  if (situacao === 'REMOVED') return <CircleOff {...props} />
  return <CalendarClock {...props} />
}
