import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listarPipelines } from '../crm/api'
import { LeadModal } from '../crm/components/LeadModal'
import { corDaEtapa } from '../crm/etapas'
import { buscarPainel } from './api'
import { RotinaDoDia } from './components/Rotina'
import { Esqueleto } from './components/pecas'
import { montarFila } from './missoes'
import type { LeadDoPainel, PainelDeHoje } from './tipos'

/** Tela Hoje: a meta do dia e as missões (responder, follow-ups, novas lojas, compromissos). */
export function HojePage() {
  const [painel, setPainel] = useState<PainelDeHoje | null>(null)
  const [erro, setErro] = useState(false)
  const [coresDasEtapas, setCoresDasEtapas] = useState<Record<string, string>>({})
  const [leadAberto, setLeadAberto] = useState<LeadDoPainel | null>(null)

  const carregar = useCallback(async () => {
    try {
      setPainel(await buscarPainel())
      setErro(false)
    } catch {
      setErro(true)
    }
  }, [])

  useEffect(() => {
    buscarPainel()
      .then(setPainel)
      .catch(() => setErro(true))
    // Cor de cada etapa, para a ficha do lead mostrar a mesma cor da coluna do quadro
    listarPipelines()
      .then((lista) => {
        const cores: Record<string, string> = {}
        lista.forEach((p) => p.stages.forEach((etapa, i) => (cores[etapa.id] = corDaEtapa(etapa, i))))
        setCoresDasEtapas(cores)
      })
      .catch(() => undefined)
  }, [])

  const fila = useMemo(() => (painel ? montarFila(painel) : []), [painel])

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Hoje · LeadNexi</title>
      {!painel && !erro ? (
        <Esqueleto />
      ) : erro || !painel ? (
        <div className="rounded-xl border border-leadnexi-danger/40 bg-card p-6">
          <p className="m-0 flex items-center gap-2 text-sm font-bold text-foreground">
            <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
            Não foi possível montar sua manhã.
          </p>
          <p className="mb-0 mt-1 text-[13px] text-muted-foreground">Tente carregar os dados novamente.</p>
          <Button variant="outline" size="sm" className={cn(botaoSecundarioDoTopo, 'mt-4')} onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <RotinaDoDia
          painel={painel}
          fila={fila}
          coresDasEtapas={coresDasEtapas}
          onAbrir={setLeadAberto}
          onMudou={carregar}
        />
      )}

      <LeadModal
        key={leadAberto?.id ?? 'fechada'}
        lead={leadAberto}
        etapa={
          leadAberto
            ? {
                nome: leadAberto.stage.name,
                tipo: leadAberto.stage.stageType,
                cor: coresDasEtapas[leadAberto.stage.id] ?? '#5C8AF6',
                fechada: leadAberto.stage.stageType === 'WON' || leadAberto.stage.stageType === 'LOST',
              }
            : null
        }
        origens={[]}
        onFechar={() => setLeadAberto(null)}
        onLeadAtualizado={(atualizado) => {
          setLeadAberto((atual) => (atual ? { ...atual, ...atualizado } : atual))
          void carregar()
        }}
        onNotasMudaram={() => undefined}
        onLeadApagado={() => {
          setLeadAberto(null)
          void carregar()
        }}
      />
    </div>
  )
}
