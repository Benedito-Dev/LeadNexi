import type { ComponentType } from 'react'
import { FileSpreadsheet, Globe, MapPin, Tag, Users } from 'lucide-react'
import { InstagramIcon, WhatsAppIcon } from '@/brand/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>

// Ícone por canal (do LeadNexi antigo). Cor só nos canais com marca própria: Instagram em
// violeta e WhatsApp no verde do WhatsApp; o resto neutro. Origem livre cai em "Tag".
const ICONES: Record<string, { Icone: Icone; cor: string }> = {
  instagram: { Icone: InstagramIcon, cor: 'text-leadnexi-violet-texto' },
  whatsapp: { Icone: WhatsAppIcon, cor: 'text-chat-wa-accent' },
  site: { Icone: Globe, cor: 'text-muted-foreground' },
  'google maps': { Icone: MapPin, cor: 'text-muted-foreground' },
  indicação: { Icone: Users, cor: 'text-muted-foreground' },
  planilha: { Icone: FileSpreadsheet, cor: 'text-muted-foreground' },
}

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
  const { Icone, cor } = ICONES[origem.trim().toLowerCase()] ?? { Icone: Tag, cor: 'text-muted-foreground' }
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
