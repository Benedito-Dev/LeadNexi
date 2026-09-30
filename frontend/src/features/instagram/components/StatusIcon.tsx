import { CalendarClock, CircleAlert, CircleCheck, CircleOff, LoaderCircle } from 'lucide-react'
import type { InstagramPostStatus } from '../types.ts'

/** Ícone do status do post (14 px): agendado, publicando (girando), publicado, falhou, removido. */
export function StatusIcon({ status, className = '' }: { status: InstagramPostStatus; className?: string }) {
  const props = { 'aria-hidden': true, size: 14, strokeWidth: 1.75, className } as const
  if (status === 'PUBLISHING') return <LoaderCircle {...props} className={`animate-spin ${className}`} />
  if (status === 'PUBLISHED') return <CircleCheck {...props} />
  if (status === 'FAILED') return <CircleAlert {...props} />
  if (status === 'REMOVED') return <CircleOff {...props} />
  return <CalendarClock {...props} />
}
