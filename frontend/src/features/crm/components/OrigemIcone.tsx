import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { iconeDaOrigem } from '../origens'

type OrigemIconeProps = {
  origem: string
  /** O quadro já está mostrando só esta origem. */
  filtrando: boolean
  /** Liga (ou desliga, se já está ligado) o filtro "só esta origem". */
  onFiltrar: (origem: string) => void
}

/**
 * Origem do lead como ícone do canal, com o nome no tooltip. Clicar filtra o quadro por esta
 * origem; clicar de novo tira o filtro.
 */
export function OrigemIcone({ origem, filtrando, onFiltrar }: OrigemIconeProps) {
  const { Icone, cor } = iconeDaOrigem(origem)
  const acao = filtrando ? 'clique para mostrar todas' : `clique para ver só ${origem}`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Origem: ${origem}, ${acao}`}
          aria-pressed={filtrando}
          // O clique é do ícone: não abre o card nem começa a arrastar
          onClick={(e) => {
            e.stopPropagation()
            onFiltrar(origem)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60',
            filtrando && 'bg-accent ring-1 ring-border',
          )}
        >
          <Icone aria-hidden strokeWidth={1.75} className={cn('h-4 w-4', cor)} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="px-2 py-1 text-xs">
        Origem: {origem} · {acao}
      </TooltipContent>
    </Tooltip>
  )
}
