import type { ReactNode } from 'react'
import { ArrowUpDown, CalendarRange, Check, ChevronDown, Search, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { OPCOES_ORDENACAO, temFiltroAtivo, type FiltroContato, type Filtros } from '../filtros'
import type { Opcao } from '../types'

type CrmFiltrosProps = {
  pipelines: Opcao[]
  pipelineSelecionado: Opcao | null
  onPipelineChange: (opcao: Opcao) => void
  onConfigurarPipelines: () => void
  filtros: Filtros
  onChange: (mudanca: Partial<Filtros>) => void
  onLimpar: () => void
  origens: Opcao[]
  visiveis: number
  total: number
}

const ATALHOS: { valor: FiltroContato; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'amanha', rotulo: 'Amanhã' },
  { valor: 'atrasados', rotulo: 'Atrasados' },
]

/** Os quatro campos da primeira linha têm o mesmo formato, para a linha ler como uma coisa só. */
const campo =
  'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60 data-[state=open]:border-foreground/25'

const segmento = (ativo: boolean) =>
  cn(
    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60',
    ativo ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  )

const formatarDia = (d: string) => {
  const [, mes, dia] = d.split('-')
  return `${dia}/${mes}`
}

function rotuloPeriodo(f: Filtros) {
  if (f.contato !== 'periodo') return 'Período'
  if (f.periodoDe && f.periodoAte) return `${formatarDia(f.periodoDe)} – ${formatarDia(f.periodoAte)}`
  if (f.periodoDe) return `Desde ${formatarDia(f.periodoDe)}`
  if (f.periodoAte) return `Até ${formatarDia(f.periodoAte)}`
  return 'Período'
}

function Campo({ rotulo, id, className, children }: { rotulo: string; id?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
        {rotulo}
      </Label>
      {children}
    </div>
  )
}

/** Card de filtros do quadro. */
export function CrmFiltros({
  pipelines,
  pipelineSelecionado,
  onPipelineChange,
  onConfigurarPipelines,
  filtros,
  onChange,
  onLimpar,
  origens,
  visiveis,
  total,
}: CrmFiltrosProps) {
  const ordenacaoAtual = OPCOES_ORDENACAO.find((o) => o.value === filtros.ordenacao) ?? OPCOES_ORDENACAO[0]
  const rotuloOrigem =
    filtros.origens.length === 0
      ? 'Todas'
      : filtros.origens.length === 1
        ? filtros.origens[0]
        : `${filtros.origens.length} origens`

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 font-marca">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        <Campo rotulo="Pipeline" className="xl:col-span-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={campo}>
                <span className="truncate">{pipelineSelecionado?.label ?? 'Selecione'}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] font-marca">
              {pipelines.map((opcao) => (
                <DropdownMenuItem key={opcao.value} onSelect={() => onPipelineChange(opcao)} className="gap-2 font-medium">
                  <Check
                    className={cn('h-4 w-4 shrink-0 text-leadnexi-cyan', opcao.value !== pipelineSelecionado?.value && 'invisible')}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{opcao.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onConfigurarPipelines} className="gap-2 font-medium text-muted-foreground">
                <span className="w-4" />
                Configurar pipelines
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Campo>

        <Campo rotulo="Buscar" id="buscaLead" className="xl:col-span-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <Input
              id="buscaLead"
              type="search"
              enterKeyHint="search"
              value={filtros.busca}
              onChange={(e) => onChange({ busca: e.target.value })}
              placeholder="Nome ou telefone"
              className="bg-background pl-10 pr-9 font-medium focus-visible:border-leadnexi-cyan/60 focus-visible:ring-leadnexi-cyan/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {filtros.busca && (
              <button
                type="button"
                onClick={() => onChange({ busca: '' })}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </Campo>

        <Campo rotulo="Origem" className="xl:col-span-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={campo}>
                <span className={cn('truncate', filtros.origens.length === 0 && 'font-medium text-muted-foreground')}>
                  {rotuloOrigem}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] font-marca">
              <DropdownMenuLabel>De onde veio o lead</DropdownMenuLabel>
              {origens.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma origem neste pipeline.</p>
              ) : (
                origens.map((origem) => (
                  <DropdownMenuCheckboxItem
                    key={origem.value}
                    checked={filtros.origens.includes(origem.value)}
                    // Continua aberto para marcar várias de uma vez
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(marcado) =>
                      onChange({
                        origens: marcado
                          ? [...filtros.origens, origem.value]
                          : filtros.origens.filter((o) => o !== origem.value),
                      })
                    }
                    className="font-medium"
                  >
                    {origem.label}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Campo>

        <Campo rotulo="Ordenar por" className="xl:col-span-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={campo} aria-label={`Ordenar por: ${ordenacaoAtual.label}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="truncate">{ordenacaoAtual.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 font-marca">
              {OPCOES_ORDENACAO.map((opcao) => (
                <DropdownMenuItem key={opcao.value} onSelect={() => onChange({ ordenacao: opcao.value })} className="gap-2 font-medium">
                  <Check
                    className={cn('h-4 w-4 shrink-0 text-leadnexi-cyan', opcao.value !== filtros.ordenacao && 'invisible')}
                    strokeWidth={1.75}
                  />
                  {opcao.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Campo>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-semibold text-muted-foreground">Próximo contato</span>
          <div
            role="group"
            aria-label="Próximo contato"
            className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-input bg-background p-0.5"
          >
            {ATALHOS.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtros.contato === valor}
                onClick={() => onChange({ contato: valor })}
                className={segmento(filtros.contato === valor)}
              >
                {rotulo}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-pressed={filtros.contato === 'periodo'} className={segmento(filtros.contato === 'periodo')}>
                  <CalendarRange className="h-4 w-4" strokeWidth={1.75} />
                  {rotuloPeriodo(filtros)}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto font-marca">
                <p className="mb-3 text-sm font-bold text-foreground">Próximo contato entre</p>
                <div className="flex items-end gap-3">
                  <div>
                    <Label htmlFor="periodoDe" className="text-xs font-semibold text-muted-foreground">
                      De
                    </Label>
                    <Input
                      id="periodoDe"
                      type="date"
                      className="h-9 w-[10.5rem]"
                      value={filtros.periodoDe}
                      onChange={({ target }) => onChange({ contato: 'periodo', periodoDe: target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodoAte" className="text-xs font-semibold text-muted-foreground">
                      Até
                    </Label>
                    <Input
                      id="periodoAte"
                      type="date"
                      className="h-9 w-[10.5rem]"
                      value={filtros.periodoAte}
                      onChange={({ target }) => onChange({ contato: 'periodo', periodoAte: target.value })}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">Preencha só uma das datas para uma busca aberta.</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {temFiltroAtivo(filtros) && (
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <span>
              Mostrando <span className="font-bold tabular-nums text-foreground">{visiveis}</span> de{' '}
              <span className="font-bold tabular-nums text-foreground">{total}</span>
            </span>
            <button
              type="button"
              onClick={onLimpar}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
