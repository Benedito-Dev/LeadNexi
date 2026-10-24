import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Opcao = { value: string; label: string; disabled?: boolean }

type NativeSelectProps = Omit<ComponentProps<'select'>, 'onChange'> & {
  options?: Opcao[]
  onChange?: (valor: string) => void
}

function NativeSelect({ value, onChange, options = [], className, ...props }: NativeSelectProps) {
  return (
    <div className={cn('relative inline-block', className)}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pl-4 pr-9 font-sans text-sm text-foreground outline-none transition-colors duration-150 hover:border-primary/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
        aria-hidden="true"
      />
    </div>
  )
}

export { NativeSelect }
