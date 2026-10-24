import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Kanban, Plus, Settings2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { Button } from '@/components/ui/button'
import { toE164BR } from '@/lib/phone'
import { addToast } from '@/lib/toast'
import { buscarQuadro, listarPipelines, moverLead } from './api'
import { AddCardModal } from './components/AddCardModal'
import { CrmActiveFilters } from './components/CrmActiveFilters'
import { CrmFilters, type DiaContato } from './components/CrmFilters'
import { KanbanBoard } from './components/KanbanBoard'
import { MotivoPerdaDialog } from './components/MotivoPerdaDialog'
import { diaDaquiA, diaLocal } from './datas'
import { escolherPipelineInicial, gravarPipelineLembrado, lerPipelineLembrado } from './pipelineLembrado'
import type { DadosDaColuna, Lead, Opcao, Quadro } from './types'

/** "Ordem de chegada" = lead novo no topo, como no Rizar. */
const ORDENACAO_PADRAO = '-created_at'

/** Quantos cards cada coluna mostra por vez antes de revelar mais ao rolar. */
const TAMANHO_DA_CARGA = 20

const OPCOES_ORDENACAO: Opcao[] = [
  { value: '-created_at', label: 'Ordem de chegada (mais novos primeiro)' },
  { value: 'created_at', label: 'Ordem de chegada (mais antigos primeiro)' },
  { value: 'name', label: 'Nome (A-Z)' },
  { value: '-name', label: 'Nome (Z-A)' },
  { value: 'date_prox_contact', label: 'Próximo contato (mais próximo)' },
  { value: '-date_prox_contact', label: 'Próximo contato (mais distante)' },
]

function comparar(ordenacao: string): (a: Lead, b: Lead) => number {
  const sinal = ordenacao.startsWith('-') ? -1 : 1
  const campo = ordenacao.replace(/^-/, '')
  if (campo === 'name') return (a, b) => sinal * a.name.localeCompare(b.name, 'pt-BR')
  if (campo === 'date_prox_contact') {
    // Sem próximo contato marcado vai para o fim nos dois sentidos
    return (a, b) => {
      if (!a.followUpAt || !b.followUpAt) return Number(!a.followUpAt) - Number(!b.followUpAt)
      return sinal * a.followUpAt.localeCompare(b.followUpAt)
    }
  }
  return (a, b) => sinal * a.createdAt.localeCompare(b.createdAt)
}

type MovimentoPendente = { cardId: string; sourceColumnId: string; destColumnId: string; leadNome: string }

/**
 * Quadro do CRM, portado do `CrmPage` do Rizar. O backend do LeadNexi entrega o pipeline
 * inteiro numa chamada, então filtros, ordenação e o "carregar mais" rodam aqui no navegador.
 */
export function CrmPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [pipelines, setPipelines] = useState<Opcao[]>([])
  const [pipelineSelecionado, setPipelineSelecionado] = useState<Opcao | null>(null)
  const [quadro, setQuadro] = useState<Quadro | null>(null)
  const [isLoadingBoard, setIsLoadingBoard] = useState(true)

  const [ordenacao, setOrdenacao] = useState(ORDENACAO_PADRAO)
  const [originSelected, setOriginSelected] = useState<readonly Opcao[]>([])
  const [checkboxDay, setCheckboxDay] = useState<DiaContato>(null)
  const [dataProxDe, setDataProxDe] = useState('')
  const [dataProxAte, setDataProxAte] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [debouncedName, setDebouncedName] = useState('')
  const [debouncedPhone, setDebouncedPhone] = useState('')

  const [visiveis, setVisiveis] = useState<Record<string, number>>({})
  const [colunaNovoLead, setColunaNovoLead] = useState<string | null>(null)
  const [movimentoPendente, setMovimentoPendente] = useState<MovimentoPendente | null>(null)

  const quadroRef = useRef(quadro)
  quadroRef.current = quadro

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(searchName), 500)
    return () => clearTimeout(timer)
  }, [searchName])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhone(searchPhone), 500)
    return () => clearTimeout(timer)
  }, [searchPhone])

  /** Seleciona o pipeline, lembra dele e põe no endereço sem poluir o histórico. */
  const selecionarPipeline = useCallback(
    (opcao: Opcao | null) => {
      setPipelineSelecionado(opcao)
      if (!opcao) return
      gravarPipelineLembrado(opcao.value)
      setSearchParams(
        (prev) => {
          const proximo = new URLSearchParams(prev)
          proximo.set('pipeline', opcao.value)
          return proximo
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // Abertura: ?pipeline -> último usado -> primeiro
  useEffect(() => {
    listarPipelines()
      .then((lista) => {
        const opcoes = lista.map((p) => ({ value: p.id, label: p.name }))
        setPipelines(opcoes)
        const escolhido = escolherPipelineInicial(opcoes, searchParams.get('pipeline'), lerPipelineLembrado())
        if (escolhido) selecionarPipeline(escolhido)
        else setIsLoadingBoard(false)
      })
      .catch(() => {
        addToast('error', 'Erro ao carregar pipelines')
        setIsLoadingBoard(false)
      })
    // Só na montagem: o endereço é lido uma vez, depois o filtro manda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarQuadro = useCallback(async (pipelineId: string) => {
    setIsLoadingBoard(true)
    try {
      setQuadro(await buscarQuadro(pipelineId))
    } catch (erro) {
      addToast('error', 'Erro ao carregar pipeline', (erro as Error).message)
      setQuadro(null)
    } finally {
      setIsLoadingBoard(false)
    }
  }, [])

  useEffect(() => {
    if (pipelineSelecionado) void carregarQuadro(pipelineSelecionado.value)
  }, [pipelineSelecionado, carregarQuadro])

  // Filtro novo começa cada coluna do topo de novo
  useEffect(() => {
    setVisiveis({})
  }, [pipelineSelecionado, ordenacao, originSelected, checkboxDay, dataProxDe, dataProxAte, debouncedName, debouncedPhone])

  const origens = useMemo(() => {
    const nomes = new Set<string>()
    quadro?.stages.forEach((etapa) => etapa.leads.forEach((lead) => lead.source && nomes.add(lead.source)))
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((nome) => ({ value: nome, label: nome }))
  }, [quadro])

  const columnsData = useMemo(() => {
    const dados: Record<string, DadosDaColuna> = {}
    if (!quadro) return dados

    const nome = debouncedName.trim().toLowerCase()
    const telefone = debouncedPhone.replace(/\D/g, '')
    const origensAtivas = new Set(originSelected.map((o) => o.value))
    const diaExato = checkboxDay !== null && checkboxDay !== 3 ? diaDaquiA(checkboxDay) : null

    const passa = (lead: Lead) => {
      if (nome && !lead.name.toLowerCase().includes(nome)) return false
      if (telefone && !toE164BR(lead.phone).includes(telefone) && !(lead.phone ?? '').includes(telefone)) return false
      if (origensAtivas.size && !origensAtivas.has(lead.source ?? '')) return false
      if (checkboxDay !== null) {
        if (!lead.followUpAt) return false
        const dia = diaLocal(new Date(lead.followUpAt))
        if (diaExato && dia !== diaExato) return false
        if (checkboxDay === 3 && ((dataProxDe && dia < dataProxDe) || (dataProxAte && dia > dataProxAte))) return false
      }
      return true
    }

    const ordem = comparar(ordenacao)
    for (const etapa of quadro.stages) {
      dados[etapa.id] = {
        results: etapa.leads.filter(passa).sort(ordem),
        visiveis: visiveis[etapa.id] ?? TAMANHO_DA_CARGA,
      }
    }
    return dados
  }, [quadro, debouncedName, debouncedPhone, originSelected, checkboxDay, dataProxDe, dataProxAte, ordenacao, visiveis])

  const handleLoadMore = useCallback((columnId: string) => {
    setVisiveis((prev) => ({ ...prev, [columnId]: (prev[columnId] ?? TAMANHO_DA_CARGA) + TAMANHO_DA_CARGA }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setOriginSelected([])
    setCheckboxDay(null)
    setDataProxDe('')
    setDataProxAte('')
    setSearchName('')
    setSearchPhone('')
    setOrdenacao(ORDENACAO_PADRAO)
    // Não troca o pipeline: limpar filtros mexe só nos filtros secundários
  }, [])

  const handleAddProspect = useCallback(
    (columnId: string | null) => {
      if (!quadro?.stages.length) {
        addToast(
          'warning',
          'Atenção',
          `O pipeline "${pipelineSelecionado?.label}" não possui etapas configuradas. Cadastre pelo menos uma etapa em CRM > Pipelines.`,
        )
        return
      }
      setColunaNovoLead(columnId)
    },
    [quadro, pipelineSelecionado],
  )

  const updateProspectsList = useCallback((novo: Lead) => {
    setQuadro((prev) =>
      prev && {
        ...prev,
        stages: prev.stages.map((etapa) =>
          etapa.id === novo.stageId ? { ...etapa, leads: [...etapa.leads, { ...novo, _count: { activities: 0 } }] } : etapa,
        ),
      },
    )
  }, [])

  /** Move o card na hora e grava; se o servidor recusar, devolve o card para onde estava. */
  const executarMovimento = useCallback(
    async (cardId: string, sourceColumnId: string, destColumnId: string, motivo?: string) => {
      const atual = quadroRef.current
      const origem = atual?.stages.find((e) => e.id === sourceColumnId)
      const destino = atual?.stages.find((e) => e.id === destColumnId)
      const lead = origem?.leads.find((l) => l.id === cardId)
      if (!atual || !origem || !destino || !lead) return

      const posicao = destino.leads.length
      const comLeadEm = (de: string, para: string, card: Lead) => (prev: Quadro | null) =>
        prev && {
          ...prev,
          stages: prev.stages.map((etapa) => {
            if (etapa.id === de) return { ...etapa, leads: etapa.leads.filter((l) => l.id !== cardId) }
            if (etapa.id === para) return { ...etapa, leads: [...etapa.leads, card] }
            return etapa
          }),
        }

      setQuadro(comLeadEm(sourceColumnId, destColumnId, { ...lead, stageId: destColumnId }))
      try {
        await moverLead(cardId, destColumnId, posicao, motivo)
      } catch (erro) {
        setQuadro(comLeadEm(destColumnId, sourceColumnId, lead))
        addToast('error', 'Erro', (erro as Error).message || 'Não foi possível mover o lead. Tente novamente.')
      }
    },
    [],
  )

  const handleMoveCard = useCallback(
    (cardId: string, sourceColumnId: string, destColumnId: string) => {
      const destino = quadroRef.current?.stages.find((e) => e.id === destColumnId)
      if (destino?.stageType === 'LOST') {
        const lead = quadroRef.current?.stages.find((e) => e.id === sourceColumnId)?.leads.find((l) => l.id === cardId)
        setMovimentoPendente({ cardId, sourceColumnId, destColumnId, leadNome: lead?.name ?? 'este lead' })
        return
      }
      void executarMovimento(cardId, sourceColumnId, destColumnId)
    },
    [executarMovimento],
  )

  // A ficha do lead (anotações, dados) chega na próxima fase
  const handleCardClick = useCallback(() => {}, [])

  const totalLeads = Object.values(columnsData).reduce((acc, col) => acc + col.results.length, 0)
  const etapas = quadro?.stages ?? []

  return (
    <div className="space-y-3">
      <ListPageHeader
        icon={Kanban}
        title="CRM Pipeline"
        totalItems={totalLeads || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/crm/pipelines')}>
              <Settings2 className="h-4 w-4 mr-1" />
              Pipelines
            </Button>
            {pipelineSelecionado && (
              <Button onClick={() => handleAddProspect(etapas[0]?.id ?? null)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Lead
              </Button>
            )}
          </div>
        }
      />

      <CrmFilters
        pipelines={pipelines}
        pipelineSelecionado={pipelineSelecionado}
        onPipelineChange={selecionarPipeline}
        origens={origens}
        originSelected={originSelected}
        onOriginChange={setOriginSelected}
        searchName={searchName}
        onSearchNameChange={setSearchName}
        searchPhone={searchPhone}
        onSearchPhoneChange={setSearchPhone}
        checkboxDay={checkboxDay}
        onCheckboxDayChange={setCheckboxDay}
        dataProxDe={dataProxDe}
        onDataProxDeChange={setDataProxDe}
        dataProxAte={dataProxAte}
        onDataProxAteChange={setDataProxAte}
        ordenacao={ordenacao}
        opcoesOrdenacao={OPCOES_ORDENACAO}
        onOrdenacaoChange={setOrdenacao}
        onClearFilters={handleClearFilters}
      />

      <CrmActiveFilters
        originSelected={originSelected}
        checkboxDay={checkboxDay}
        dataProxDe={dataProxDe}
        dataProxAte={dataProxAte}
        searchName={searchName}
        searchPhone={searchPhone}
        onRemoveOrigin={(valor) => setOriginSelected((prev) => prev.filter((o) => o.value !== valor))}
        onRemoveCheckboxDay={() => {
          setCheckboxDay(null)
          setDataProxDe('')
          setDataProxAte('')
        }}
        onRemoveSearchName={() => setSearchName('')}
        onRemoveSearchPhone={() => setSearchPhone('')}
        onClearAll={handleClearFilters}
      />

      <KanbanBoard
        columns={etapas}
        columnsData={columnsData}
        onLoadMore={handleLoadMore}
        onCardClick={handleCardClick}
        onMoveCard={handleMoveCard}
        onAddProspect={handleAddProspect}
        isLoading={isLoadingBoard}
        temPipelines={pipelines.length > 0}
        pipelineSelecionado={!!pipelineSelecionado}
        onConfigurarPipelines={() =>
          navigate(pipelineSelecionado ? `/crm/pipelines?pipeline=${pipelineSelecionado.value}` : '/crm/pipelines')
        }
      />

      <AddCardModal
        key={colunaNovoLead ?? 'fechado'}
        laneId={colunaNovoLead}
        triggerModal={() => setColunaNovoLead(null)}
        updateProspectsList={updateProspectsList}
        origens={origens}
        etapas={etapas}
        nomePipeline={pipelineSelecionado?.label}
      />

      <MotivoPerdaDialog
        leadNome={movimentoPendente?.leadNome ?? null}
        onCancelar={() => setMovimentoPendente(null)}
        onConfirmar={(motivo) => {
          if (movimentoPendente) {
            const { cardId, sourceColumnId, destColumnId } = movimentoPendente
            void executarMovimento(cardId, sourceColumnId, destColumnId, motivo)
          }
          setMovimentoPendente(null)
        }}
      />
    </div>
  )
}
