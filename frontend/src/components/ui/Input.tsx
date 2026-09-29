import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

type InputProps = ComponentProps<'input'> & {
  icon?: LucideIcon
  /** Conteúdo à direita, dentro do campo (ex.: botão de mostrar senha) */
  trailing?: ReactNode
}

// Campo de texto da marca (BRAND.md, seção 8): altura 44, raio 12, ícone 18px à esquerda.
export function Input({ icon: Icon, trailing, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          aria-hidden
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
        />
      )}
      <input
        className={`h-11 w-full rounded-md border bg-navy-800 text-body text-white placeholder:text-slate-400 aria-[invalid=true]:border-danger ${Icon ? 'pl-10.5' : 'pl-3.5'} ${trailing ? 'pr-11' : 'pr-3.5'} ${className}`}
        {...props}
      />
      {trailing && (
        <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
      )}
    </div>
  )
}
