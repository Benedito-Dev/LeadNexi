import { useCallback, useEffect, useState } from 'react'
import { Building2, CalendarClock, ChevronDown, Info, LoaderCircle } from 'lucide-react'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { cn } from '@/lib/utils'
import { formatarDataHora } from '../crm/datas'
import { formatarDecorrido, formatarDiaEHora } from '../hoje/textos'
import { MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import { listarAgentes, listarExecucoes, type Agente, type Execucao, type SituacaoDaExecucao } from './api'
import { Personagem } from './components/Personagem'
import { SalaDoEscritorio } from './components/SalaDoEscritorio'
import { estadoDoAgente, ROTULO_DO_ESTADO, type Estado } from './estado'
import './escritorio.css'

/**
 * Os agentes avisam começo e fim; a tela confere a cada 3 s enquanto está à vista (quase ao vivo:
 * quem acorda já sai andando). Com a aba escondida, para de conferir e confere de novo ao voltar.
 */
const ATUALIZA_A_CADA_MS = 3_000

const TOM_DO_ESTADO: Record<Estado, string> = {
  trabalhando: 'border-leadnexi-cyan/40 bg-leadnexi-cyan/10 text-leadnexi-cyan-texto',
  terminou: 'border-success-foreground/30 bg-success-foreground/10 text-success-foreground',
  falhou: 'border-leadnexi-danger/30 bg-leadnexi-danger/10 text-leadnexi-danger',
  dormindo: 'border-border bg-muted text-muted-foreground',
}

const ROTULO_DA_EXECUCAO: Record<SituacaoDaExecucao, { texto: string; cor: string }> = {
  RUNNING: { texto: 'Trabalhando', cor: 'text-leadnexi-cyan-texto' },
  SUCCEEDED: { texto: 'Terminou', cor: 'text-success-foreground' },
  FAILED: { texto: 'Falhou', cor: 'text-leadnexi-danger' },
  STALE: { texto: 'Parou sem avisar', cor: 'text-leadnexi-danger' },
}

/** Hora de Fortaleza, para o relógio da parede. */
const horaDeFortaleza = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })

/**
 * Escritório: os agentes que trabalham no Claude Code da VPS, numa sala em pixel art (mesa quando
 * trabalham, sofá da copa quando descansam), e embaixo o que cada um faz, quando roda e o que
 * produziu (docs/produto/MAPA.md, seção 6).
 */
export function EscritorioPage() {
  const [agentes, setAgentes] = useState<Agente[] | null>(null)
  const [erro, setErro] = useState(false)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [hora, setHora] = useState(horaDeFortaleza)

  const carregar = useCallback(() => {
    listarAgentes()
      .then((lista) => {
        setAgentes(lista)
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [])

  useEffect(() => {
    carregar()
    const busca = setInterval(() => {
      if (document.visibilityState === 'visible') carregar()
    }, ATUALIZA_A_CADA_MS)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const relogio = setInterval(() => setHora(horaDeFortaleza()), 15_000)
    return () => {
      clearInterval(busca)
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  const ninguemRodou = agentes !== null && agentes.every((a) => !a.lastRun)
  const trabalhando = agentes?.filter((a) => estadoDoAgente(a) === 'trabalhando').length ?? 0

  const selecionar = (id: string) => {
    setSelecionado(id)
    document.getElementById(`agente-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Escritório · LeadNexi</title>
      <ListPageHeader
        icon={Building2}
        title="Escritório"
        summary={agentes ? (trabalhando > 0 ? `${trabalhando} trabalhando agora` : 'Seus agentes no Claude Code da VPS') : 'Seus agentes no Claude Code da VPS'}
      />

      {erro && <MensagemDeErro texto="Não foi possível carregar o escritório. Atualize a página para tentar de novo." />}

      {ninguemRodou && (
        <p className="m-0 flex items-start gap-2.5 rounded-xl border border-leadnexi-cyan/30 bg-leadnexi-cyan/5 px-4 py-3 text-sm font-medium text-foreground">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leadnexi-cyan-texto" strokeWidth={1.75} />
          Ninguém trabalhou ainda. Os agentes começam quando a VPS estiver pronta, com o Claude Code logado e o horário de cada um marcado.
        </p>
      )}

      <section aria-label="Sala dos agentes" className="flex flex-col gap-2">
        {agentes === null ? (
          <div className="grid aspect-[16/10] place-items-center rounded-xl border border-border bg-card">
            <LoaderCircle aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
          </div>
        ) : (
          <SalaDoEscritorio agentes={agentes} hora={hora} selecionado={selecionado} onSelecionar={selecionar} />
        )}
        <p className="m-0 text-right text-xs font-medium text-muted-foreground">Arte da sala: Pixel Office, de 2dPig (CC0)</p>
      </section>

      {agentes && agentes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {agentes.map((agente) => (
            <CartaoDoAgente key={agente.id} agente={agente} selecionado={selecionado === agente.id} />
          ))}
        </div>
      )}
    </div>
  )
}

/** O agente por escrito: o que faz, quando roda, a situação e o último resultado; abre o histórico. */
function CartaoDoAgente({ agente, selecionado }: { agente: Agente; selecionado: boolean }) {
  const estado = estadoDoAgente(agente)
  const [aberto, setAberto] = useState(false)
  const [execucoes, setExecucoes] = useState<Execucao[] | null>(null)
  const ultima = agente.lastRun

  const alternar = () => {
    setAberto((a) => !a)
    if (!execucoes) listarExecucoes(agente.id).then(setExecucoes).catch(() => setExecucoes([]))
  }

  return (
    <article
      id={`agente-${agente.id}`}
      className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors', selecionado ? 'border-leadnexi-violet/60' : 'border-border')}
    >
      <header className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted">
          <Personagem character={agente.character} dormindo={estado === 'dormindo'} altura={36} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-base font-extrabold text-foreground">{agente.name}</h3>
            <span className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-bold', TOM_DO_ESTADO[estado])}>{ROTULO_DO_ESTADO[estado]}</span>
          </div>
          <p className="m-0 mt-1 text-sm font-medium text-muted-foreground">{agente.role}</p>
        </div>
      </header>

      <p className="m-0 flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <CalendarClock aria-hidden className="h-4 w-4 text-leadnexi-violet-texto" strokeWidth={1.75} />
        {agente.scheduleTime ? (
          <>
            Todo dia às {agente.scheduleTime}
            {agente.nextRunAt && <span className="font-medium text-muted-foreground">· próxima {formatarDiaEHora(agente.nextRunAt).toLowerCase()}</span>}
          </>
        ) : (
          <span className="font-medium text-muted-foreground">Sem horário marcado</span>
        )}
      </p>

      <div className="rounded-lg bg-muted/60 px-3 py-2.5">
        <p className="m-0 text-xs font-semibold text-muted-foreground">
          {ultima ? `Última vez há ${formatarDecorrido(ultima.startedAt)}` : 'Ainda não rodou'}
        </p>
        {ultima?.summary && <p className="m-0 mt-1 line-clamp-3 whitespace-pre-wrap text-sm font-medium text-foreground">{ultima.summary}</p>}
      </div>

      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex items-center gap-1.5 self-start text-[13px] font-bold text-leadnexi-cyan-texto hover:underline"
      >
        <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} strokeWidth={2} />
        Execuções
      </button>
      {aberto &&
        (execucoes === null ? (
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.75} />
        ) : execucoes.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">Nenhuma execução ainda.</p>
        ) : (
          <ol className="m-0 flex flex-col divide-y divide-border rounded-lg border border-border p-0">
            {execucoes.map((execucao) => {
              const rotulo = ROTULO_DA_EXECUCAO[execucao.status]
              return (
                <li key={execucao.id} className="list-none px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('text-xs font-bold', rotulo.cor)}>{rotulo.texto}</span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatarDataHora(execucao.startedAt)}</span>
                  </div>
                  {execucao.summary && <p className="m-0 mt-0.5 line-clamp-2 text-[13px] text-foreground">{execucao.summary}</p>}
                </li>
              )
            })}
          </ol>
        ))}
    </article>
  )
}
