import { CalendarClock, CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import type { InstagramPostStatus } from '../types.ts'

/** Ícone do status do post (14 px): agendado, publicando (girando), publicado, falhou. */
export function StatusIcon({ status, className = '' }: { status: InstagramPostStatus; className?: string }) {
  const props = { 'aria-hidden': true, size: 14, strokeWidth: 1.75, className } as const
  if (status === 'PUBLISHING') return <LoaderCircle {...props} className={`animate-spin ${className}`} />
  if (status === 'PUBLISHED') return <CircleCheck {...props} />
  if (status === 'FAILED') return <CircleAlert {...props} />
  return <CalendarClock {...props} />
}
