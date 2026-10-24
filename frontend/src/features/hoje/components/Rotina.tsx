import { useState } from 'react'
import { Clock3, Flame, Play, Target, Zap } from 'lucide-react'
import { GoogleMeetLogo, WhatsAppLogo } from '@/brand/icons'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { iconeDaOrigem } from '../../crm/origens'
import { mensagemSugerida, type Missao, type TipoMissao } from '../missoes'
import { formatarDecorrido, formatarDiaEHora } from '../textos'
import type { LeadDoPainel, PainelDeHoje } from '../tipos'
import { useConcluirMissao } from '../useConcluirMissao'
import { useFilaEmFoco } from '../useFilaEmFoco'
import { BotaoConversa } from './BotaoConversa'
import { BotaoWhatsApp } from './BotaoWhatsApp'
import { MissaoEmFoco } from './MissaoEmFoco'
import { CirculoConcluir, EtiquetaDaEtapa, FilaVazia, type AcoesDaMissao } from './pecas'

/** Minutos estimados por tipo de ação (para o "cerca de X min" e cada linha). */
const MINUTOS: Record<TipoMissao, number> = { response: 3, 'follow-up': 5, new: 5, meeting: 0 }

/** Abre uma reunião nova no Google Meet (o lead ainda não guarda o link da reunião). */
const MEET_NOVA = 'https://meet.google.com/new'

/** Quantas ações a lista mostra antes do "ver mais". */
const NA_LISTA = 5

// Botões de canal com as cores e os logos oficiais
const botaoDeCanal = 'inline-flex h-10 w-[148px] shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors'
const botaoWhatsApp = cn(botaoDeCanal, 'bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90')
const botaoMeet = cn(botaoDeCanal, 'border border-border bg-meet text-meet-foreground hover:bg-meet/90')

/** O que fazer com o lead e o detalhe que ajuda a decidir, por tipo de missão. */
function descreverMissao(lead: LeadDoPainel, tipo: TipoMissao) {
  if (tipo === 'response')
    return lead.followUpAt
      ? { acao: 'Retomar conversa', detalhe: `Retorno combinado · último contato há ${formatarDecorrido(lead.updatedAt)}` }
      : { acao: 'Respondeu você', detalhe: `Respondeu há ${formatarDecorrido(lead.updatedAt)}` }
  if (tipo === 'follow-up')
    return {
      acao: lead.cadenceStep === 2 ? 'Último follow-up' : 'Fazer follow-up',
      detalhe: `Último contato há ${formatarDecorrido(lead.updatedAt)}`,
    }
  if (tipo === 'meeting') return { acao: 'Reunião', detalhe: lead.meetingAt ? formatarDiaEHora(lead.meetingAt) : 'Horário a confirmar' }
  return {
    acao: 'Enviar primeira mensagem',
    detalhe: ['Lead novo', lead.source ? `Veio de ${lead.source}` : null, lead.neighborhood].filter(Boolean).join(' · '),
  }
}

type RotinaDoDiaProps = {
  painel: PainelDeHoje
  fila: Missao[]
  /** Cor de cada etapa (id → cor), a mesma das colunas do quadro do CRM. */
  coresDasEtapas: Record<string, string>
} & AcoesDaMissao

/**
 * Tela Hoje: título, a missão do dia com a barra de progresso, as próximas ações numa lista
 * numerada e "Começar próxima ação", que abre o lead em foco por cima (uma conversa de cada vez).
 */
export function RotinaDoDia({ painel, fila, coresDasEtapas, onAbrir, onMudou }: RotinaDoDiaProps) {
  const f = useFilaEmFoco(fila)
  const [verTodas, setVerTodas] = useState(false)
  const [focoAberto, setFocoAberto] = useState(false)
  const meta = painel.dailyTarget
  const feitas = painel.actionsDoneToday
  const porcentagem = meta > 0 ? Math.min(Math.round((feitas / meta) * 100), 100) : 0
  const faltam = Math.max(meta - feitas, 0)
  const minutos = f.acoes.slice(0, Math.max(faltam, 1)).reduce((soma, m) => soma + MINUTOS[m.tipo], 0)
  const lista = verTodas ? f.todas : f.todas.slice(0, NA_LISTA)

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-leadnexi-violet-texto">Sua rotina de hoje</p>
          <h1 className="mb-0 mt-1 text-[44px] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground">
            Bora <span className="text-leadnexi-violet-texto">prospectar?</span>
          </h1>
          <p className="mb-0 mt-2 text-base font-medium text-muted-foreground">Um passo de cada vez. Faça o que importa hoje.</p>
        </div>
        <div className="flex items-center divide-x divide-border rounded-full border border-border bg-card px-1 py-2 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2 px-4" title="Dias seguidos batendo a meta">
            <Flame aria-hidden className={cn('h-[18px] w-[18px]', painel.streakDays > 0 ? 'text-warn-foreground' : 'text-muted-foreground')} strokeWidth={1.75} />
            {painel.streakDays} {painel.streakDays === 1 ? 'dia' : 'dias'} de ritmo
          </span>
          <span className="inline-flex items-center gap-2 px-4" title="Contatos feitos nesta semana">
            <Zap aria-hidden className="h-[18px] w-[18px] text-leadnexi-violet-texto" strokeWidth={1.75} />
            {painel.contactsMade} de {painel.weeklyTarget} na semana
          </span>
        </div>
      </header>

      <section className="flex gap-5 rounded-2xl border border-border bg-card p-6">
        <Target aria-hidden className="mt-1 h-9 w-9 shrink-0 text-leadnexi-violet-texto" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-leadnexi-violet-texto">Missão do dia</p>
          <h2 className="mb-0 mt-1 text-2xl font-extrabold tracking-[-0.02em] text-foreground">
            {feitas >= meta ? 'Meta mínima batida!' : 'Bata sua meta mínima.'}
          </h2>
          <p className="mb-0 mt-1 text-sm font-medium text-muted-foreground">Conclua {meta} ações de prospecção hoje.</p>
          <div className="mt-5 flex items-baseline justify-between gap-3">
            <p className="m-0 text-sm font-semibold text-muted-foreground">
              <span className="text-2xl font-extrabold tabular-nums text-foreground">{feitas}</span> de {meta} ações
            </p>
            <span className="text-sm font-bold tabular-nums text-foreground">{porcentagem}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan transition-[width] duration-500"
              style={{ width: `${porcentagem}%` }}
            />
          </div>
          {faltam > 0 && minutos > 0 && (
            <p className="mb-0 mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <Clock3 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Cerca de {Math.max(5, Math.round((minutos * 0.8) / 5) * 5)}–{Math.max(10, Math.round((minutos * 1.3) / 5) * 5)} min
            </p>
          )}
        </div>
      </section>

      {f.todas.length === 0 ? (
        <FilaVazia feitasHoje={feitas} />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em] text-foreground">Próximas ações</h2>
            <span className="text-sm font-semibold text-muted-foreground">
              {f.todas.length} {f.todas.length === 1 ? 'missão' : 'missões'}
            </span>
          </div>
          <ol className="m-0 flex flex-col gap-2 p-0">
            {lista.map((missao, i) => (
              <LinhaDaRotina
                key={`${missao.tipo}-${missao.lead.id}`}
                numero={i + 1}
                missao={missao}
                corDaEtapa={coresDasEtapas[missao.lead.stage.id] ?? '#5C8AF6'}
                onAbrir={onAbrir}
                onMudou={onMudou}
              />
            ))}
          </ol>
          {f.todas.length > NA_LISTA && (
            <button
              type="button"
              onClick={() => setVerTodas((v) => !v)}
              className="self-start rounded-md px-2 py-1 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {verTodas ? 'Mostrar só as próximas' : `Ver todas (${f.todas.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              f.irPara(0)
              setFocoAberto(true)
            }}
            className="mt-2 flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-leadnexi-violet-600 px-6 py-4 text-leadnexi-on-accent transition-colors hover:bg-leadnexi-violet-600/90"
          >
            <span className="inline-flex items-center gap-2.5 text-lg font-extrabold">
              <Play aria-hidden className="h-5 w-5 fill-current" strokeWidth={1.75} />
              Começar próxima ação
            </span>
            <span className="text-[13px] font-medium opacity-80">Uma conversa de cada vez.</span>
          </button>
        </section>
      )}

      {/* O lead em foco por cima da tela: WhatsApp, feito, adiar e pular, um de cada vez */}
      <Dialog open={focoAberto && Boolean(f.emFoco)} onOpenChange={setFocoAberto}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none sm:max-w-3xl [&>button]:right-5 [&>button]:top-5">
          <DialogTitle className="sr-only">Uma conversa de cada vez</DialogTitle>
          <DialogDescription className="sr-only">O lead em foco e as ações dele</DialogDescription>
          {f.emFoco && (
            <MissaoEmFoco
              key={`${f.emFoco.tipo}-${f.emFoco.lead.id}`}
              missao={f.emFoco}
              posicao={f.atual + 1}
              total={f.todas.length}
              corDaEtapa={coresDasEtapas[f.emFoco.lead.stage.id] ?? '#5C8AF6'}
              onAnterior={f.anterior}
              onProxima={f.proxima}
              onAbrir={(lead) => {
                setFocoAberto(false)
                onAbrir(lead)
              }}
              onMudou={onMudou}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LinhaDaRotina({ numero, missao, corDaEtapa, onAbrir, onMudou }: { numero: number; missao: Missao; corDaEtapa: string } & AcoesDaMissao) {
  const { tipo, lead } = missao
  const { acao, detalhe } = descreverMissao(lead, tipo)
  const mensagem = mensagemSugerida(lead, tipo)
  const { feita, ocupado, podeMarcar, concluir, marcarFeita } = useConcluirMissao(lead, tipo, onMudou)
  const { Icone, cor } = iconeDaOrigem(lead.source ?? '')

  return (
    <li className={cn('flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-opacity md:flex-nowrap', feita && 'opacity-45')}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-base font-extrabold tabular-nums text-foreground">{numero}</span>
      <Icone aria-hidden strokeWidth={1.75} className={cn('h-6 w-6 shrink-0', lead.source ? cor : 'text-muted-foreground')} />
      <div className="min-w-0 basis-56 md:w-64 md:flex-none">
        <button
          type="button"
          onClick={() => onAbrir(lead)}
          className={cn('block max-w-full cursor-pointer truncate text-left text-[15px] font-bold text-foreground hover:underline', feita && 'line-through')}
        >
          {lead.name}
        </button>
        <span className="block truncate text-[13px] font-medium text-muted-foreground">{acao}</span>
      </div>
      <div className="hidden min-w-0 flex-1 border-l border-border pl-5 md:block">
        <span className="block truncate text-[13px] font-medium text-muted-foreground">{detalhe}</span>
        {MINUTOS[tipo] > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
            <Clock3 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {MINUTOS[tipo]} min
          </span>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <EtiquetaDaEtapa lead={lead} cor={corDaEtapa} className="w-40 justify-center" />
        {/* Só dois caminhos: reunião (tarefa ou coluna) vai para o Meet; o resto, para o WhatsApp */}
        {tipo === 'meeting' || lead.stage.stageType === 'MEETING' ? (
          <a href={MEET_NOVA} target="_blank" rel="noopener noreferrer" className={botaoMeet}>
            <GoogleMeetLogo aria-hidden size={20} />
            Meet
          </a>
        ) : tipo === 'response' ? (
          <BotaoConversa lead={lead} rotulo="WhatsApp" icone={<WhatsAppLogo aria-hidden size={18} />} className={botaoWhatsApp} onRegistrada={marcarFeita} />
        ) : (
          <BotaoWhatsApp lead={lead} mensagem={mensagem} rotulo="WhatsApp" className={botaoWhatsApp} onEnviado={marcarFeita} />
        )}
        {/* Conversa e reunião não se marcam pelo círculo: a vaga fica, para os círculos alinharem */}
        <span className="flex w-12 justify-center">
          {podeMarcar && <CirculoConcluir lead={lead} tipo={tipo} feita={feita} ocupado={ocupado} onConcluir={() => void concluir(mensagem)} />}
        </span>
      </div>
    </li>
  )
}
