import { useState, type ComponentProps } from 'react'
import { formatPhoneBR, mascararTelefone, toE164BR } from '@/lib/phone'
import { cn } from '@/lib/utils'

type PhoneInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string
  /**
   * Recebe a forma canônica (`55DDDNÚMERO`), ou '' enquanto o número não está completo.
   * `completo` diz se o valor já pode ser gravado (número inteiro, ou campo vazio de propósito).
   */
  onChange: (canonico: string, info: { completo: boolean }) => void
}

/** Telefone com "+55" fixo à esquerda e máscara brasileira, como o `PhoneInput` do Rizar. */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  placeholder = '(85) 99906-2339',
  ...props
}: PhoneInputProps) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  const exibido = rascunho ?? (value ? formatPhoneBR(value) : '')

  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        +55
      </span>
      <input
        type="tel"
        inputMode="tel"
        value={exibido}
        disabled={disabled}
        placeholder={placeholder}
        onChange={({ target }) => {
          const digitado = mascararTelefone(target.value)
          setRascunho(digitado)
          const canonico = toE164BR(digitado)
          onChange(canonico, { completo: Boolean(canonico) || !digitado.replace(/\D/g, '') })
        }}
        onBlur={(e) => {
          if (!rascunho || toE164BR(rascunho)) setRascunho(null)
          onBlur?.(e)
        }}
        className={cn(
          'flex h-10 w-full rounded-r-lg border border-input bg-card px-4 py-2 font-sans text-sm text-foreground ring-offset-background transition-colors duration-150',
          'placeholder:text-muted-foreground',
          'hover:border-primary/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/60',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          className,
        )}
        {...props}
      />
    </div>
  )
}
