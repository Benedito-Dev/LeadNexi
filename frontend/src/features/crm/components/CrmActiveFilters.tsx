import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Opcao } from '../types'
import type { DiaContato } from './CrmFilters'

type CrmActiveFiltersProps = {
  originSelected: readonly Opcao[]
  checkboxDay: DiaContato
  dataProxDe: string
  dataProxAte: string
  searchName: string
  searchPhone: string
  onRemoveOrigin: (valor: string) => void
  onRemoveCheckboxDay: () => void
  onRemoveSearchName: () => void
  onRemoveSearchPhone: () => void
  onClearAll: () => void
}

const formatarDia = (d: string) => {
  const [ano, mes, dia] = d.split('-')
  return dia && mes ? `${dia}/${mes}/${ano}` : d
}

/** Chips removíveis com os filtros em uso, logo abaixo do card de filtros. */
export function CrmActiveFilters(props: CrmActiveFiltersProps) {
  const { originSelected, checkboxDay, dataProxDe, dataProxAte } = props
  const nome = props.searchName.trim()
  const telefone = props.searchPhone.trim()
  const hasFilters = originSelected.length > 0 || checkboxDay !== null || nome || telefone
  if (!hasFilters) return null

  const rotuloContato = () => {
    if (checkboxDay === 0) return 'Hoje'
    if (checkboxDay === 1) return 'Amanhã'
    if (checkboxDay === 2) return 'Depois de amanhã'
    if (dataProxDe && dataProxAte) return `${formatarDia(dataProxDe)} a ${formatarDia(dataProxAte)}`
    if (dataProxDe) return `A partir de ${formatarDia(dataProxDe)}`
    if (dataProxAte) return `Até ${formatarDia(dataProxAte)}`
    return 'Personalizado'
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>

      {originSelected.map((origem) => (
        <FilterChip
          key={`origin-${origem.value}`}
          label="Origem"
          value={origem.label}
          onRemove={() => props.onRemoveOrigin(origem.value)}
        />
      ))}
      {checkboxDay !== null && <FilterChip label="Contato" value={rotuloContato()} onRemove={props.onRemoveCheckboxDay} />}
      {nome && <FilterChip label="Nome" value={nome} onRemove={props.onRemoveSearchName} />}
      {telefone && <FilterChip label="Telefone" value={telefone} onRemove={props.onRemoveSearchPhone} />}

      <button
        onClick={props.onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors ml-1"
        aria-label="Limpar todos os filtros"
      >
        Limpar todos
      </button>
    </div>
  )
}

function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal max-w-[200px]">
      <span className="font-medium">{label}:</span>
      <span className="truncate">{value}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors shrink-0"
        aria-label={`Remover filtro ${label}: ${value}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}
