import { useCallback, useEffect, useState } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { Kanban, Layers, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { DeleteDialog } from '@/components/modal/DeleteDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { cn } from '@/lib/utils'
import { addToast } from '@/lib/toast'
import {
  atualizarEtapa,
  criarEtapa,
  criarPipeline,
  excluirEtapa,
  excluirPipeline,
  listarPipelines,
  renomearPipeline,
  reordenarEtapas,
  type DadosEtapa,
} from './api'
import { EtapaArrastavel } from './components/EtapaArrastavel'
import { EtapaForm } from './components/EtapaForm'
import { COR_PADRAO_ETAPA, corDaEtapa } from './etapas'
import type { Etapa, PipelineResumo } from './types'

/**
 * Estrutura sugerida do Rizar, com o tipo de cada etapa no LeadNexi: atalho para quem acabou de
 * criar o pipeline e não sabe por onde começar.
 */
const ESTRUTURA_SUGERIDA: DadosEtapa[] = [
  { name: 'Novo lead', color: '#3B82F6', stageType: 'CONTACT' },
  { name: 'Em contato', color: '#8B5CF6', stageType: 'SENT' },
  { name: 'Qualificado', color: '#F59E0B', stageType: 'RESPONDED' },
  { name: 'Negociação', color: '#EC4899', stageType: 'PROPOSAL' },
  { name: 'Fechado', color: '#10B981', stageType: 'WON' },
]

const ETAPA_NOVA: DadosEtapa = { name: '', color: COR_PADRAO_ETAPA, stageType: 'CUSTOM' }

/**
 * Configuração dos pipelines e das etapas que viram as colunas do quadro, portada do
 * `PipelinesPage` do Rizar. Descrição, status ativo, responsáveis, formulário externo e canal
 * ficaram de fora: o LeadNexi não tem esses conceitos.
 */
export function PipelinesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [pipelines, setPipelines] = useState<PipelineResumo[]>([])
  const [pipelineSelecionado, setPipelineSelecionado] = useState<PipelineResumo | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const [salvando, setSalvando] = useState(false)
  // Trava o arrasto durante a gravação: soltar duas vezes seguidas mandaria duas ordens concorrentes
  const [salvandoOrdem, setSalvandoOrdem] = useState(false)

  const [modalPipelineAberto, setModalPipelineAberto] = useState(false)
  const [pipelineEmEdicao, setPipelineEmEdicao] = useState<PipelineResumo | null>(null)
  const [nomePipeline, setNomePipeline] = useState('')

  const [modalEtapaAberto, setModalEtapaAberto] = useState(false)
  const [etapaEmEdicao, setEtapaEmEdicao] = useState<Etapa | null>(null)
  const [formEtapa, setFormEtapa] = useState<DadosEtapa>(ETAPA_NOVA)

  const [pipelineParaExcluir, setPipelineParaExcluir] = useState<PipelineResumo | null>(null)
  const [etapaParaExcluir, setEtapaParaExcluir] = useState<Etapa | null>(null)

  /** Recarrega a lista e reseleciona (o pedido, o que já estava aberto ou o primeiro). */
  const carregarPipelines = useCallback(async (idParaSelecionar: string | null = null) => {
    setLoadingPipelines(true)
    try {
      const lista = await listarPipelines()
      setPipelines(lista)
      setPipelineSelecionado((atual) => {
        const alvo = idParaSelecionar ?? atual?.id
        return lista.find((p) => p.id === alvo) ?? lista[0] ?? null
      })
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os pipelines')
    } finally {
      setLoadingPipelines(false)
    }
  }, [])

  // Primeira carga: respeita ?pipeline= (o botão "Cadastrar etapas" do quadro manda para cá assim)
  useEffect(() => {
    void carregarPipelines(searchParams.get('pipeline'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // As etapas vêm junto da lista de pipelines
  useEffect(() => {
    setEtapas(pipelineSelecionado?.stages ?? [])
  }, [pipelineSelecionado])

  const selecionarPipeline = (pipeline: PipelineResumo) => {
    setPipelineSelecionado(pipeline)
    setSearchParams({ pipeline: pipeline.id }, { replace: true })
  }

  /**
   * Aplica a ordem nova ao soltar uma etapa: a lista muda na hora e a gravação vai depois. Se o
   * servidor recusar, volta a ordem anterior (ordem parcial seria pior que nenhuma).
   */
  const aplicarNovaOrdem = useCallback(
    async (idArrastada: string, idAlvo: string, borda: 'top' | 'bottom' | null) => {
      if (!pipelineSelecionado) return
      const atual = etapas
      const de = atual.findIndex((e) => e.id === idArrastada)
      const alvo = atual.findIndex((e) => e.id === idAlvo)
      if (de === -1 || alvo === -1) return

      const nova = [...atual]
      const [movida] = nova.splice(de, 1)
      // O índice do alvo anda 1 para trás quando a etapa saiu de cima dele
      const base = de < alvo ? alvo - 1 : alvo
      nova.splice(borda === 'bottom' ? base + 1 : base, 0, movida)
      if (nova.every((e, i) => e.id === atual[i].id)) return

      setEtapas(nova)
      setSalvandoOrdem(true)
      try {
        const salvas = await reordenarEtapas(
          pipelineSelecionado.id,
          nova.map((e) => e.id),
        )
        if (salvas.length) setEtapas(salvas)
        setPipelines((lista) => lista.map((p) => (p.id === pipelineSelecionado.id ? { ...p, stages: salvas } : p)))
      } catch (erro) {
        setEtapas(atual)
        addToast('error', 'Erro', (erro as Error).message)
      } finally {
        setSalvandoOrdem(false)
      }
    },
    [etapas, pipelineSelecionado],
  )

  // Um monitor para a lista inteira: quem sabe a ordem final é a página, não a linha
  useEffect(() => {
    if (etapas.length < 2) return
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'etapa',
      onDrop: ({ source, location }) => {
        const destino = location.current.dropTargets[0]
        if (!destino || destino.data.type !== 'etapa') return
        const borda = extractClosestEdge(destino.data)
        void aplicarNovaOrdem(
          source.data.etapaId as string,
          destino.data.etapaId as string,
          borda === 'top' || borda === 'bottom' ? borda : null,
        )
      },
    })
  }, [etapas.length, aplicarNovaOrdem])

  // ============================================
  // PIPELINE
  // ============================================

  const abrirModalPipeline = (pipeline: PipelineResumo | null = null) => {
    setPipelineEmEdicao(pipeline)
    setNomePipeline(pipeline?.name ?? '')
    setModalPipelineAberto(true)
  }

  const salvarPipeline = async () => {
    if (!nomePipeline.trim()) {
      addToast('error', 'Erro', 'O nome do pipeline é obrigatório')
      return
    }
    setSalvando(true)
    try {
      if (pipelineEmEdicao) {
        await renomearPipeline(pipelineEmEdicao.id, nomePipeline.trim())
        addToast('success', 'Sucesso', 'Pipeline atualizado')
        setModalPipelineAberto(false)
        await carregarPipelines(pipelineEmEdicao.id)
      } else {
        const criado = await criarPipeline(nomePipeline.trim())
        addToast('success', 'Sucesso', 'Pipeline criado')
        setModalPipelineAberto(false)
        await carregarPipelines(criado.id)
        setSearchParams({ pipeline: criado.id }, { replace: true })
      }
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message || 'Não foi possível salvar o pipeline')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusaoPipeline = async () => {
    if (!pipelineParaExcluir) return
    setSalvando(true)
    try {
      await excluirPipeline(pipelineParaExcluir.id)
      addToast('success', 'Sucesso', 'Pipeline excluído')
      setPipelineParaExcluir(null)
      setPipelineSelecionado(null)
      setSearchParams({}, { replace: true })
      await carregarPipelines()
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message || 'Não foi possível excluir o pipeline')
    } finally {
      setSalvando(false)
    }
  }

  // ============================================
  // ETAPAS
  // ============================================

  const abrirModalEtapa = useCallback((etapa: Etapa | null = null) => {
    setEtapaEmEdicao(etapa)
    setFormEtapa(
      etapa ? { name: etapa.name, color: etapa.color || COR_PADRAO_ETAPA, stageType: etapa.stageType } : ETAPA_NOVA,
    )
    setModalEtapaAberto(true)
  }, [])

  const salvarEtapa = async () => {
    if (!pipelineSelecionado) return
    if (!formEtapa.name.trim()) {
      addToast('error', 'Erro', 'O nome da etapa é obrigatório')
      return
    }
    if (!/^#[0-9a-f]{6}$/i.test(formEtapa.color)) {
      addToast('error', 'Erro', 'Informe a cor no formato #3B82F6')
      return
    }
    const dados = { ...formEtapa, name: formEtapa.name.trim() }
    setSalvando(true)
    try {
      if (etapaEmEdicao) {
        await atualizarEtapa(etapaEmEdicao.id, dados)
        addToast('success', 'Sucesso', 'Etapa atualizada')
      } else {
        await criarEtapa(pipelineSelecionado.id, dados)
        addToast('success', 'Sucesso', 'Etapa criada')
      }
      setModalEtapaAberto(false)
      await carregarPipelines(pipelineSelecionado.id)
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusaoEtapa = async () => {
    if (!etapaParaExcluir || !pipelineSelecionado) return
    setSalvando(true)
    try {
      await excluirEtapa(etapaParaExcluir.id)
      addToast('success', 'Sucesso', 'Etapa excluída')
      setEtapaParaExcluir(null)
      await carregarPipelines(pipelineSelecionado.id)
    } catch (erro) {
      // Ex.: etapa com leads (o servidor diz o que fazer antes)
      addToast('error', 'Erro', (erro as Error).message || 'Não foi possível excluir a etapa')
    } finally {
      setSalvando(false)
    }
  }

  /** Cria as 5 etapas da estrutura sugerida em sequência (a ordem de criação é a ordem no quadro). */
  const criarEstruturaSugerida = async () => {
    if (!pipelineSelecionado) return
    setSalvando(true)
    try {
      for (const etapa of ESTRUTURA_SUGERIDA) await criarEtapa(pipelineSelecionado.id, etapa)
      addToast('success', 'Sucesso', 'Etapas criadas — já pode usar o CRM')
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message)
    } finally {
      await carregarPipelines(pipelineSelecionado.id)
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <ListPageHeader
          icon={Layers}
          title="Pipelines"
          summary={
            <>
              <span className="font-bold tabular-nums text-foreground">{pipelines.length}</span>{' '}
              {pipelines.length === 1 ? 'pipeline' : 'pipelines'}
              {pipelineSelecionado && (
                <>
                  {' · '}
                  <span className="font-bold tabular-nums text-foreground">{etapas.length}</span>{' '}
                  {etapas.length === 1 ? 'etapa' : 'etapas'} em{' '}
                  <span className="font-semibold text-foreground">{pipelineSelecionado.name}</span>
                </>
              )}
            </>
          }
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className={botaoSecundarioDoTopo}
                onClick={() => navigate(pipelineSelecionado ? `/crm?pipeline=${pipelineSelecionado.id}` : '/crm')}
              >
                <Kanban className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Ver o CRM
              </Button>
              <Button size="sm" className={botaoPrincipalDoTopo} onClick={() => abrirModalPipeline()}>
                <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Novo pipeline
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seus pipelines</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada pipeline é um funil independente. As etapas viram as colunas do Kanban em CRM.
            </p>
          </CardHeader>
          <CardContent>
            {loadingPipelines && pipelines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : pipelines.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Layers className="h-7 w-7 text-muted-foreground opacity-40" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Nenhum pipeline criado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Crie o primeiro pipeline pra organizar seus leads. Sem pipeline, o CRM não tem colunas.
                </p>
                <Button onClick={() => abrirModalPipeline()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar pipeline
                </Button>
              </div>
            ) : (
              <div className={cn(barraDeSegmentos, 'gap-1 p-1 font-marca')} role="tablist" aria-label="Pipelines">
                {/* Mais respiro que no quadro: aqui as opções são nomes de pipeline, não atalhos curtos */}
                {pipelines.map((pipeline) => {
                  const selecionado = pipelineSelecionado?.id === pipeline.id
                  return (
                    <button
                      key={pipeline.id}
                      role="tab"
                      aria-selected={selecionado}
                      onClick={() => selecionarPipeline(pipeline)}
                      className={cn(segmento(selecionado), 'h-9 px-4')}
                    >
                      {pipeline.name}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {pipelineSelecionado && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-base">{pipelineSelecionado.name}</CardTitle>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className={botaoSecundarioDoTopo} onClick={() => abrirModalPipeline(pipelineSelecionado)}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/50 font-semibold text-destructive hover:bg-destructive/10"
                  onClick={() => setPipelineParaExcluir(pipelineSelecionado)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  Excluir
                </Button>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Etapas</h3>
                  <p className="text-sm text-muted-foreground">
                    {etapas.length} {etapas.length === 1 ? 'etapa' : 'etapas'} — viram as colunas do Kanban, na ordem
                    abaixo.
                  </p>
                </div>
                <Button size="sm" className={botaoPrincipalDoTopo} onClick={() => abrirModalEtapa()}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Nova etapa
                </Button>
              </div>

              {etapas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Este pipeline ainda não tem etapas — o CRM aparece vazio enquanto isso.
                  </p>
                  <Button variant="outline" onClick={criarEstruturaSugerida} disabled={salvando}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Usar estrutura sugerida (5 etapas)
                  </Button>
                </div>
              ) : (
                <>
                  {etapas.length > 1 && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Arraste pela alça à esquerda para mudar a ordem das etapas no quadro. A ordem salva sozinha.
                    </p>
                  )}
                  <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {etapas.map((etapa, i) => (
                      <EtapaArrastavel
                        key={etapa.id}
                        etapa={etapa}
                        cor={corDaEtapa(etapa, i)}
                        onEditar={abrirModalEtapa}
                        onExcluir={setEtapaParaExcluir}
                        salvando={salvandoOrdem}
                      />
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={modalPipelineAberto} onOpenChange={(aberto) => !aberto && setModalPipelineAberto(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{pipelineEmEdicao ? 'Editar pipeline' : 'Novo pipeline'}</DialogTitle>
            <DialogDescription>Um pipeline é um funil de vendas com suas próprias etapas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-nome">Nome *</Label>
              <Input
                id="pipeline-nome"
                value={nomePipeline}
                maxLength={80}
                onChange={(e) => setNomePipeline(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void salvarPipeline()}
                placeholder="Ex: Funil de vendas — lojas de bairro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className={botaoSecundarioDoTopo} onClick={() => setModalPipelineAberto(false)}>
              Cancelar
            </Button>
            <Button className={botaoPrincipalDoTopo} onClick={salvarPipeline} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEtapaAberto} onOpenChange={(aberto) => !aberto && setModalEtapaAberto(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{etapaEmEdicao ? 'Editar etapa' : 'Nova etapa'}</DialogTitle>
            <DialogDescription>A etapa vira uma coluna do Kanban em {pipelineSelecionado?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <EtapaForm valor={formEtapa} onChange={setFormEtapa} />
          </div>
          <DialogFooter>
            <Button variant="outline" className={botaoSecundarioDoTopo} onClick={() => setModalEtapaAberto(false)}>
              Cancelar
            </Button>
            <Button className={botaoPrincipalDoTopo} onClick={salvarEtapa} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!pipelineParaExcluir}
        onOpenChange={(aberto) => !aberto && setPipelineParaExcluir(null)}
        onDelete={confirmarExclusaoPipeline}
        loading={salvando}
        headerText={`o pipeline ${pipelineParaExcluir?.name ?? ''}`}
        bodyText="este pipeline e todas as etapas dele"
      />

      <DeleteDialog
        open={!!etapaParaExcluir}
        onOpenChange={(aberto) => !aberto && setEtapaParaExcluir(null)}
        onDelete={confirmarExclusaoEtapa}
        loading={salvando}
        headerText={`a etapa ${etapaParaExcluir?.name ?? ''}`}
        bodyText="esta etapa"
      />
    </>
  )
}
