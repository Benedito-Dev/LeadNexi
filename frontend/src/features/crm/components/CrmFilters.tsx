import { useState } from 'react'
import { X } from 'lucide-react'
import { MutaseSelect } from '@/components/ui/async-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import type { Opcao } from '../types'

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

/** Atalhos do próximo contato: `null` = todos, 0/1/2 = dia exato, 3 = intervalo personalizado. */
export type DiaContato = null | 0 | 1 | 2 | 3

type CrmFiltersProps = {
  pipelines: Opcao[]
  pipelineSelecionado: Opcao | null
  onPipelineChange: (opcao: Opcao | null) => void
  origens: Opcao[]
  originSelected: readonly Opcao[]
  onOriginChange: (opcoes: readonly Opcao[]) => void
  searchName: string
  onSearchNameChange: (valor: string) => void
  searchPhone: string
  onSearchPhoneChange: (valor: string) => void
  checkboxDay: DiaContato
  onCheckboxDayChange: (valor: DiaContato) => void
  dataProxDe: string
  onDataProxDeChange: (valor: string) => void
  dataProxAte: string
  onDataProxAteChange: (valor: string) => void
  ordenacao: string
  opcoesOrdenacao: Opcao[]
  onOrdenacaoChange: (valor: string) => void
  onClearFilters: () => void
}

/**
 * Filtros do quadro, no mesmo grid de duas linhas do Rizar. Turma, consultor, indicador e
 * etiqueta ficaram de fora: o LeadNexi não tem esses conceitos.
 */
export function CrmFilters(props: CrmFiltersProps) {
  const { checkboxDay, onCheckboxDayChange } = props
  const [dayLabels] = useState(() => {
    const depoisDeAmanha = (new Date().getDay() + 2) % 7
    return { today: 'Hoje', tomorrow: 'Amanhã', afterTomorrow: DIAS[depoisDeAmanha] }
  })

  const radio = (valor: DiaContato, rotulo: string) => (
    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
      <input
        type="radio"
        name="checkboxDay"
        checked={checkboxDay === valor}
        onChange={() => onCheckboxDayChange(valor)}
        className="accent-primary"
      />
      {rotulo}
    </label>
  )

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label htmlFor="tipoPipeline" className="font-semibold text-sm mb-1 block">
              Pipeline:
            </Label>
            <MutaseSelect<Opcao>
              inputId="tipoPipeline"
              options={props.pipelines}
              value={props.pipelineSelecionado}
              onChange={(opcao) => props.onPipelineChange(opcao)}
              placeholder="Selecione..."
              menuPortalTarget={document.body}
            />
          </div>
          <div>
            <Label htmlFor="origem" className="font-semibold text-sm mb-1 block">
              Origem
            </Label>
            <MutaseSelect<Opcao, true>
              inputId="origem"
              options={props.origens}
              isMulti
              value={props.originSelected}
              onChange={(opcoes) => props.onOriginChange(opcoes)}
              placeholder=""
              noOptionsMessage={() => 'Nenhum item'}
              menuPortalTarget={document.body}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label htmlFor="searchName" className="font-semibold text-sm mb-1 block">
              Buscar por Nome
            </Label>
            <Input
              id="searchName"
              type="search"
              enterKeyHint="search"
              value={props.searchName}
              onChange={(e) => props.onSearchNameChange(e.target.value)}
              placeholder="Digite o nome..."
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="ordenacao" className="font-semibold text-sm mb-1 block">
              Ordenar por
            </Label>
            <NativeSelect
              id="ordenacao"
              className="w-full"
              aria-label="Ordenar os leads do quadro"
              value={props.ordenacao}
              onChange={props.onOrdenacaoChange}
              options={props.opcoesOrdenacao}
            />
          </div>
          <div>
            <Label htmlFor="searchPhone" className="font-semibold text-sm mb-1 block">
              Buscar por Telefone
            </Label>
            <Input
              id="searchPhone"
              inputMode="tel"
              value={props.searchPhone}
              onChange={(e) => props.onSearchPhoneChange(e.target.value)}
              placeholder="Ex: 9073 ou 8599"
            />
          </div>
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Label htmlFor="dia" className="font-semibold text-sm mb-1 block">
              Data do próximo contato
            </Label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-1">
              {radio(null, 'Todos')}
              {radio(0, dayLabels.today)}
              {radio(1, dayLabels.tomorrow)}
              {radio(2, dayLabels.afterTomorrow)}
              {radio(3, 'Personalizado')}
            </div>

            {checkboxDay === 3 && (
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dataProxDe" className="text-xs mb-0">
                    De
                  </Label>
                  <Input
                    id="dataProxDe"
                    type="date"
                    className="h-9 w-[10.5rem]"
                    value={props.dataProxDe}
                    onChange={({ target }) => props.onDataProxDeChange(target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dataProxAte" className="text-xs mb-0">
                    Até
                  </Label>
                  <Input
                    id="dataProxAte"
                    type="date"
                    className="h-9 w-[10.5rem]"
                    value={props.dataProxAte}
                    onChange={({ target }) => props.onDataProxAteChange(target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground pb-2">Preencha só uma das pontas para busca aberta.</p>
              </div>
            )}
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end">
            <Button variant="outline" onClick={props.onClearFilters} className="gap-1.5">
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
