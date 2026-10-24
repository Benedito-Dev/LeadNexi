import { FormField } from '@/components/form/FormField'
import { Check, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { campoMenu } from '@/components/ui/campo-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { DadosEtapa } from '../api'
import { CORES_DE_ETAPA, ICONE_DA_ETAPA, OPCOES_TIPO_ETAPA, ROTULO_TIPO_ETAPA } from '../etapas'
import { cn } from '@/lib/utils'

type EtapaFormProps = {
  valor: DadosEtapa
  onChange: (valor: DadosEtapa) => void
}

/**
 * Formulário da etapa, no layout do `ProspectStatusForm` do Rizar. "Ordem" virou "Tipo da etapa"
 * (a ordem aqui se muda arrastando na lista) e "Status" saiu (etapa no LeadNexi não desativa).
 */
export function EtapaForm({ valor, onChange }: EtapaFormProps) {
  const IconeTipo = ICONE_DA_ETAPA[valor.stageType]
  const corLivre = !CORES_DE_ETAPA.some((opcao) => opcao.cor.toLowerCase() === valor.color.toLowerCase())
  const mudar = <K extends keyof DadosEtapa>(campo: K, novo: DadosEtapa[K]) => onChange({ ...valor, [campo]: novo })

  return (
    <>
      <FormField label="Nome da Etapa" required htmlFor="name">
        <Input
          id="name"
          placeholder="Ex: Reunião marcada"
          value={valor.name}
          onChange={({ target }) => mudar('name', target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <FormField label="Tipo da Etapa" required htmlFor="stageType">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" id="stageType" className={campoMenu}>
                  <span className="flex min-w-0 items-center gap-2">
                    <IconeTipo className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                    <span className="truncate">{ROTULO_TIPO_ETAPA[valor.stageType]}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {OPCOES_TIPO_ETAPA.map(({ value, label }) => {
                  const Icone = ICONE_DA_ETAPA[value]
                  return (
                    <DropdownMenuItem key={value} onSelect={() => mudar('stageType', value)} className="gap-2 font-medium">
                      <Icone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                      <span className="flex-1">{label}</span>
                      {value === valor.stageType && <Check className="h-4 w-4 text-leadnexi-cyan" strokeWidth={1.75} />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-sm text-muted-foreground">
              "Fechou" cria a ficha de cliente; "Perdido" pede o motivo ao mover o lead
            </p>
          </FormField>
        </div>

      </div>

      {/* Mesma paleta do menu "Trocar cor" da coluna: as cores da marca e uma livre */}
      <FormField label="Cor da Etapa">
        <div className="flex flex-wrap items-center gap-2">
          {CORES_DE_ETAPA.map((opcao) => {
            const escolhida = opcao.cor.toLowerCase() === valor.color.toLowerCase()
            return (
              <button
                key={opcao.cor}
                type="button"
                onClick={() => mudar('color', opcao.cor)}
                aria-label={opcao.nome}
                aria-pressed={escolhida}
                title={opcao.nome}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60',
                  escolhida && 'ring-2 ring-foreground',
                )}
                style={{ backgroundColor: opcao.cor }}
              >
                {escolhida && <Check className="h-4 w-4 text-white" strokeWidth={2.5} />}
              </button>
            )
          })}
          <label
            className={cn(
              'ml-1 flex cursor-pointer items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-medium text-foreground hover:bg-accent',
              corLivre && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
            )}
          >
            <input
              type="color"
              value={valor.color}
              onChange={(e) => mudar('color', e.target.value)}
              className="!min-h-0 h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
            Outra cor
          </label>
        </div>
      </FormField>
    </>
  )
}
