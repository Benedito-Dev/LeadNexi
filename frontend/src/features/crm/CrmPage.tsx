import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { addToast } from '@/lib/toast'
import { atualizarEtapa, buscarQuadro, listarPipelines, moverLead } from './api'
import { AddCardModal } from './components/AddCardModal'
import { CrmHeader } from './components/CrmHeader'
import { CrmFiltros } from './components/CrmFiltros'
import { KanbanBoard } from './components/KanbanBoard'
import { MotivoPerdaDialog } from './components/MotivoPerdaDialog'
import { calcularPlacar, criarFiltro, criarOrdenacao, FILTROS_INICIAIS, type Filtros } from './filtros'
import { escolherPipelineInicial, gravarPipelineLembrado, lerPipelineLembrado } from './pipelineLembrado'
import type { DadosDaColuna, Lead, Opcao, Quadro } from './types'

/** Quantos cards cada coluna mostra por vez antes de revelar mais ao rolar. */
const TAMANHO_DA_CARGA = 20

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

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [buscaAplicada, setBuscaAplicada] = useState('')

  const [visiveis, setVisiveis] = useState<Record<string, number>>({})
  const [colunaNovoLead, setColunaNovoLead] = useState<string | null>(null)
  const [movimentoPendente, setMovimentoPendente] = useState<MovimentoPendente | null>(null)

  const quadroRef = useRef(quadro)
  quadroRef.current = quadro

  useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(filtros.busca), 400)
    return () => clearTimeout(timer)
  }, [filtros.busca])

  const mudarFiltros = useCallback((mudanca: Partial<Filtros>) => setFiltros((prev) => ({ ...prev, ...mudanca })), [])

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
  }, [pipelineSelecionado, filtros.contato, filtros.periodoDe, filtros.periodoAte, filtros.origens, filtros.ordenacao, buscaAplicada])

  const origens = useMemo(() => {
    const nomes = new Set<string>()
    quadro?.stages.forEach((etapa) => etapa.leads.forEach((lead) => lead.source && nomes.add(lead.source)))
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((nome) => ({ value: nome, label: nome }))
  }, [quadro])

  const columnsData = useMemo(() => {
    const dados: Record<string, DadosDaColuna> = {}
    if (!quadro) return dados
    const passa = criarFiltro({ ...filtros, busca: buscaAplicada })
    const ordem = criarOrdenacao(filtros.ordenacao)
    for (const etapa of quadro.stages) {
      dados[etapa.id] = {
        results: etapa.leads.filter((lead) => passa(lead, etapa)).sort(ordem),
        visiveis: visiveis[etapa.id] ?? TAMANHO_DA_CARGA,
      }
    }
    return dados
  }, [quadro, filtros, buscaAplicada, visiveis])

  const placar = useMemo(() => calcularPlacar(quadro?.stages ?? []), [quadro])

  const handleLoadMore = useCallback((columnId: string) => {
    setVisiveis((prev) => ({ ...prev, [columnId]: (prev[columnId] ?? TAMANHO_DA_CARGA) + TAMANHO_DA_CARGA }))
  }, [])

  // Não troca o pipeline nem a ordenação: limpar mexe só no que esconde cards
  const handleClearFilters = useCallback(
    () => setFiltros((prev) => ({ ...FILTROS_INICIAIS, ordenacao: prev.ordenacao })),
    [],
  )

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

  // Nome e cor da etapa, mudados pelo menu da coluna: aparecem na hora e são gravados. O seletor
  // livre de cor muda a cada movimento, então grava só quando ele para (e volta ao original se falhar).
  const temporizadoresDaEtapa = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const originaisDaEtapa = useRef<Record<string, { name: string; color: string | null }>>({})

  const alterarEtapa = useCallback((id: string, mudanca: { name?: string; color?: string }, adiar = false) => {
    const atual = quadroRef.current?.stages.find((e) => e.id === id)
    if (!atual) return
    originaisDaEtapa.current[id] ??= { name: atual.name, color: atual.color }
    const aplicar = (campos: { name?: string; color?: string | null }) =>
      setQuadro((prev) => prev && { ...prev, stages: prev.stages.map((e) => (e.id === id ? { ...e, ...campos } : e)) })
    aplicar(mudanca)

    const gravar = async () => {
      try {
        await atualizarEtapa(id, mudanca)
      } catch (erro) {
        aplicar(originaisDaEtapa.current[id])
        addToast('error', 'Erro', (erro as Error).message || 'Não foi possível alterar a etapa.')
      } finally {
        delete originaisDaEtapa.current[id]
      }
    }
    clearTimeout(temporizadoresDaEtapa.current[id])
    if (adiar) temporizadoresDaEtapa.current[id] = setTimeout(gravar, 400)
    else void gravar()
  }, [])

  // Ícone de origem no card: mostra só aquela origem; clicar de novo (já filtrando só ela) tira o filtro
  const handleFiltrarOrigem = useCallback((origem: string) => {
    setFiltros((prev) => ({
      ...prev,
      origens: prev.origens.length === 1 && prev.origens[0] === origem ? [] : [origem],
    }))
  }, [])

  const handleRenomearEtapa = useCallback((id: string, nome: string) => alterarEtapa(id, { name: nome }), [alterarEtapa])
  const handleTrocarCorEtapa = useCallback(
    (id: string, cor: string, adiar?: boolean) => alterarEtapa(id, { color: cor }, adiar),
    [alterarEtapa],
  )

  const visiveisNoQuadro = Object.values(columnsData).reduce((acc, col) => acc + col.results.length, 0)
  const etapas = quadro?.stages ?? []
  const irParaPipelines = () =>
    navigate(pipelineSelecionado ? `/crm/pipelines?pipeline=${pipelineSelecionado.value}` : '/crm/pipelines')

  return (
    <div className="space-y-3">
      <CrmHeader
        nomePipeline={pipelineSelecionado?.label}
        totalLeads={placar.leads}
        emAberto={placar.emAberto}
        podeCriarLead={!!pipelineSelecionado}
        onNovoLead={() => handleAddProspect(etapas[0]?.id ?? null)}
        onConfigurarPipelines={irParaPipelines}
      />

      <CrmFiltros
        pipelines={pipelines}
        pipelineSelecionado={pipelineSelecionado}
        onPipelineChange={selecionarPipeline}
        onConfigurarPipelines={irParaPipelines}
        filtros={filtros}
        onChange={mudarFiltros}
        onLimpar={handleClearFilters}
        origens={origens}
        visiveis={visiveisNoQuadro}
        total={placar.leads}
      />

      <KanbanBoard
        columns={etapas}
        columnsData={columnsData}
        onLoadMore={handleLoadMore}
        onCardClick={handleCardClick}
        onMoveCard={handleMoveCard}
        onAddProspect={handleAddProspect}
        origensFiltradas={filtros.origens}
        onFiltrarOrigem={handleFiltrarOrigem}
        onRenomearEtapa={handleRenomearEtapa}
        onTrocarCorEtapa={handleTrocarCorEtapa}
        isLoading={isLoadingBoard}
        temPipelines={pipelines.length > 0}
        pipelineSelecionado={!!pipelineSelecionado}
        onConfigurarPipelines={irParaPipelines}
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
