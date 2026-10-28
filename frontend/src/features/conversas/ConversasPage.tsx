import { useCallback, useEffect, useRef, useState } from 'react'
import { Inbox } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { buscarLead, listarPipelines, moverLead } from '../crm/api'
import { LeadModal } from '../crm/components/LeadModal'
import { corDaEtapa } from '../crm/etapas'
import type { Etapa, PipelineResumo, StageType } from '../crm/types'
import { buscarHistorico, chaveDaConversa, listarConversas } from './api'
import { ConversaAberta } from './components/ConversaAberta'
import { ListaDeConversas } from './components/ListaDeConversas'
import { ResumoDoLead, type LeadDoPainel } from './components/ResumoDoLead'
import { esperandoVoce, type Filtro } from './filtros'
import type { Canal, Conversa, Historico, Mensagem } from './tipos'

/** De quanto em quanto tempo a lista e a conversa aberta buscam mensagens novas (direct e WhatsApp chegam sozinhos). */
const ATUALIZA_LISTA_MS = 20_000
const ATUALIZA_CONVERSA_MS = 8_000

type LeadComEtapa = LeadDoPainel & { stage: { id: string; name: string; stageType: StageType; pipelineId: string } }

/** Roda `tarefa` a cada `ms` enquanto a aba está visível. */
function useRepetir(tarefa: () => void, ms: number, ativo = true) {
  useEffect(() => {
    if (!ativo) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') tarefa()
    }, ms)
    return () => window.clearInterval(id)
  }, [tarefa, ms, ativo])
}

/**
 * Conversas: a caixa de entrada do direct do Instagram e do WhatsApp dentro do LeadNexi. Lista à
 * esquerda, a conversa aberta no meio (com resposta) e o resumo do lead à direita. A conversa aberta
 * fica no endereço (?lead=...&canal=...), para dar para voltar nela.
 */
export function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[] | null>(null)
  const [erro, setErro] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const [params, setParams] = useSearchParams()
  const abertaId = params.get('lead')
  // O mesmo lead pode conversar pelos dois canais; endereço antigo, sem canal, é do Instagram
  const canalAberto: Canal = params.get('canal') === 'whatsapp' ? 'whatsapp' : 'instagram'
  const chaveAberta = abertaId ? chaveDaConversa({ id: abertaId, canal: canalAberto }) : null
  const [historico, setHistorico] = useState<{ chave: string; dados: Historico } | null>(null)
  const [lead, setLead] = useState<LeadComEtapa | null>(null)
  const [fichaAberta, setFichaAberta] = useState(false)
  const [cores, setCores] = useState<Record<string, string>>({})
  const [pipelines, setPipelines] = useState<PipelineResumo[]>([])
  // Ficha da direita aberta ou recolhida (lembrada neste navegador)
  const [fichaVisivel, setFichaVisivel] = useState(() => {
    try {
      return localStorage.getItem('leadnexi.conversas.ficha') !== 'recolhida'
    } catch {
      return true
    }
  })
  const alternarFicha = () =>
    setFichaVisivel((visivel) => {
      try {
        localStorage.setItem('leadnexi.conversas.ficha', visivel ? 'recolhida' : 'aberta')
      } catch {
        // sem armazenamento: vale só nesta visita
      }
      return !visivel
    })

  const aberta = conversas?.find((c) => chaveDaConversa(c) === chaveAberta) ?? null
  const historicoDaAberta = historico?.chave === chaveAberta ? historico.dados : null
  const leadDaAberta = lead?.id === abertaId ? lead : null

  // Sobe a cada mudança feita aqui (ex.: "Não é lead"): a lista que saiu antes dela chega velha e é descartada
  const versaoLocal = useRef(0)

  const carregarLista = useCallback(() => {
    const versao = versaoLocal.current
    listarConversas()
      .then((lista) => {
        if (versao !== versaoLocal.current) return
        setConversas(lista)
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [])

  const carregarConversa = useCallback(() => {
    if (!abertaId || !chaveAberta) return
    buscarHistorico(abertaId, canalAberto)
      .then((dados) => setHistorico({ chave: chaveAberta, dados }))
      .catch(() => undefined)
  }, [abertaId, canalAberto, chaveAberta, setHistorico])

  useEffect(() => {
    carregarLista()
    // Cor de cada etapa, a mesma das colunas do quadro do CRM
    listarPipelines()
      .then((lista) => {
        const mapa: Record<string, string> = {}
        lista.forEach((p) => p.stages.forEach((etapa, i) => (mapa[etapa.id] = corDaEtapa(etapa, i))))
        setCores(mapa)
        setPipelines(lista)
      })
      .catch(() => undefined)
  }, [carregarLista])

  const carregarLead = useCallback(() => {
    if (!abertaId) return
    buscarLead(abertaId)
      .then((encontrado) => setLead(encontrado))
      .catch(() => undefined)
  }, [abertaId, setLead])

  useEffect(() => {
    carregarConversa()
    carregarLead()
  }, [carregarConversa, carregarLead])

  const mover = async (etapa: Etapa) => {
    if (!leadDaAberta || etapa.id === leadDaAberta.stage.id) return
    try {
      await moverLead(leadDaAberta.id, etapa.id, 0)
      addToast('success', `Movido para ${etapa.name}`, leadDaAberta.name)
      carregarLead()
      carregarLista()
    } catch {
      addToast('error', 'Não foi possível mover', 'Tente de novo.')
    }
  }

  useRepetir(carregarLista, ATUALIZA_LISTA_MS)
  useRepetir(carregarConversa, ATUALIZA_CONVERSA_MS, Boolean(abertaId))

  const abrir = (conversa: Conversa) => setParams({ lead: conversa.id, canal: conversa.canal }, { replace: true })

  const enviada = (mensagem: Mensagem) => {
    setHistorico((h) => (h && h.chave === chaveAberta ? { ...h, dados: { ...h.dados, messages: [...h.dados.messages, mensagem] } } : h))
    setConversas((lista) => lista?.map((c) => (chaveDaConversa(c) === chaveAberta ? { ...c, lastMessage: { text: mensagem.text, direction: 'sent', createdAt: mensagem.createdAt } } : c)) ?? null)
  }

  const suaVez = (conversas ?? []).filter(esperandoVoce).length

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Conversas · LeadNexi</title>
      {/* Título simples numa linha, como no Rizar */}
      <div className="flex items-baseline gap-3 border-b border-border pb-3">
        <h1 className="m-0 inline-flex items-center gap-2 text-lg font-bold text-foreground">
          <Inbox aria-hidden className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          Conversas
        </h1>
        {conversas !== null && (
          <span className="text-sm font-medium text-muted-foreground">
            {suaVez > 0 ? `${suaVez} esperando sua resposta` : 'tudo respondido'}
          </span>
        )}
      </div>

      {erro && conversas === null ? (
        <p className="m-0 rounded-xl border border-leadnexi-danger/40 bg-card p-5 text-sm font-semibold text-foreground">Não foi possível carregar as conversas. Atualize a página para tentar de novo.</p>
      ) : (
        <div className="grid h-[calc(100dvh-11rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[340px_minmax(0,1fr)]">
          {/* No celular, uma coluna por vez: a lista ou a conversa */}
          <div className={cn('min-h-0', abertaId ? 'hidden md:flex md:flex-col' : 'flex flex-col')}>
            <ListaDeConversas conversas={conversas} filtro={filtro} onFiltro={setFiltro} busca={busca} onBusca={setBusca} abertaChave={chaveAberta} onAbrir={abrir} onAtualizar={carregarLista} />
          </div>
          <div className={cn('min-h-0 min-w-0', abertaId ? 'flex' : 'hidden md:flex')}>
            {/* A chave zera o rascunho ao trocar de conversa */}
            <ConversaAberta
              key={aberta ? chaveDaConversa(aberta) : 'nenhuma'}
              conversa={aberta}
              historico={historicoDaAberta}
              onEnviada={enviada}
              onVoltar={() => setParams({}, { replace: true })}
              etapa={leadDaAberta ? { id: leadDaAberta.stage.id, nome: leadDaAberta.stage.name, cor: cores[leadDaAberta.stage.id] ?? '#5C8AF6' } : null}
              etapas={pipelines.find((p) => p.id === leadDaAberta?.stage.pipelineId)?.stages ?? []}
              cores={cores}
              onMover={(etapa) => void mover(etapa)}
              fichaVisivel={fichaVisivel}
              onAlternarFicha={alternarFicha}
              onNotaSalva={carregarLead}
              onReagiu={(id, reaction) =>
                setHistorico((h) => (h && h.chave === chaveAberta ? { ...h, dados: { ...h.dados, messages: h.dados.messages.map((m) => (m.id === id ? { ...m, reaction } : m)) } } : h))
              }
            />
            {/* A ficha desliza da direita: a coluna abre a largura e o conteúdo entra com um esmaecimento */}
            {aberta && (
              <div
                aria-hidden={!fichaVisivel}
                className={cn('hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-out xl:block', fichaVisivel ? 'w-80' : 'w-0')}
              >
                <div className={cn('h-full w-80 transition-[transform,opacity] duration-300 ease-out', fichaVisivel ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0')}>
                  <ResumoDoLead
                    conversa={aberta}
                    lead={leadDaAberta}
                    onMudou={carregarLead}
                    corDaEtapa={(leadDaAberta && cores[leadDaAberta.stage.id]) || '#5C8AF6'}
                    onAbrirFicha={() => setFichaAberta(true)}
                    onMudouLead={(archived) => {
                      versaoLocal.current += 1
                      // O lead é o mesmo nos dois canais
                      setConversas((lista) => lista?.map((c) => (c.id === aberta.id ? { ...c, archived } : c)) ?? null)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LeadModal
        key={fichaAberta && leadDaAberta ? leadDaAberta.id : 'fechada'}
        lead={fichaAberta ? leadDaAberta : null}
        etapa={
          fichaAberta && leadDaAberta
            ? {
                nome: leadDaAberta.stage.name,
                tipo: leadDaAberta.stage.stageType,
                cor: cores[leadDaAberta.stage.id] ?? '#5C8AF6',
                fechada: leadDaAberta.stage.stageType === 'WON' || leadDaAberta.stage.stageType === 'LOST',
              }
            : null
        }
        origens={[]}
        onFechar={() => setFichaAberta(false)}
        onLeadAtualizado={(atualizado) => {
          setLead((atual) => (atual ? { ...atual, ...atualizado } : atual))
          carregarLista()
        }}
        onNotasMudaram={() => undefined}
        onLeadApagado={() => {
          setFichaAberta(false)
          setParams({}, { replace: true })
          carregarLista()
        }}
      />
    </div>
  )
}
