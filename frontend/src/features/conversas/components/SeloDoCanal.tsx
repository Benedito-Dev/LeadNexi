import { InstagramIcon, WhatsAppLogo } from '@/brand/icons'
import { cn } from '@/lib/utils'
import type { Canal } from '../tipos'

/** Selinho do canal no canto da foto: Instagram (gradiente) ou WhatsApp (verde). */
export function SeloDoCanal({ canal, className }: { canal: Canal; className?: string }) {
  return (
    <span
      title={canal === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
      className={cn(
        'absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card text-white',
        canal === 'whatsapp' ? 'bg-whatsapp' : 'bg-gradient-to-br from-fuchsia-500 to-amber-400',
        className,
      )}
    >
      {canal === 'whatsapp' ? <WhatsAppLogo aria-hidden size={8} /> : <InstagramIcon aria-hidden size={8} strokeWidth={2.5} />}
    </span>
  )
}
