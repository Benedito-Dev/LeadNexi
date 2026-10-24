import { Check, ChevronDown } from 'lucide-react'
import { campoMenu } from '@/components/ui/campo-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type OpcaoDoSeletor = { value: string; label: string }

type SeletorProps = {
  id?: string
  valor: string
  opcoes: OpcaoDoSeletor[]
  onChange: (valor: string) => void
  /** Texto quando nada está escolhido. */
  vazio?: string
  disabled?: boolean
  className?: string
}

/** Escolha de uma opção com o menu do sistema (no lugar do `<select>` nativo do navegador). */
export function Seletor({ id, valor, opcoes, onChange, vazio = 'Escolha', disabled, className }: SeletorProps) {
  const atual = opcoes.find((o) => o.value === valor)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" id={id} className={cn(campoMenu, 'disabled:cursor-not-allowed disabled:opacity-50', className)}>
          <span className={cn('truncate', !atual && 'font-medium text-muted-foreground')}>{atual?.label ?? vazio}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        {opcoes.map((opcao) => (
          <DropdownMenuItem key={opcao.value} onSelect={() => onChange(opcao.value)} className="gap-2 font-medium">
            <span className="flex-1 truncate">{opcao.label}</span>
            {opcao.value === valor && <Check className="h-4 w-4 shrink-0 text-leadnexi-cyan" strokeWidth={1.75} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
