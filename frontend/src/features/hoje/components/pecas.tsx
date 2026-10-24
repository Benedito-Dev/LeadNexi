import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Check, Flame, MessageCircle, Play, Trophy } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { addToast } from '@/lib/toast'
import { agendarContato } from '../../crm/api'
import { formatarReais } from '../../crm/filtros'
import { concluirContato } from '../api'
import {
  contextoDaMissao,
  DIAS_DA_SEMANA,
  fraseDoProgresso,
  hojeEmFortaleza,
  maiuscula,
  mensagemSugerida,
  SEMANA_DE_OURO,
  type Missao,
  type TipoMissao,
} from '../missoes'
import { formatarDiaEHora } from '../textos'
import type { LeadDoPainel, PainelDeHoje } from '../tipos'
import { useConcluirMissao } from '../useConcluirMissao'
import { iconeDaOrigem } from '../../crm/origens'
import { BotaoWhatsApp } from './BotaoWhatsApp'

export function Placar({ painel, nome, pendentes, onComecar }: { painel: PainelDeHoje; nome: string; pendentes: Missao[]; onComecar: () => void }) {
  const [data] = useState(() => new Date())
  const saudacao = data.getHours() < 12 ? 'Bom dia' : data.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dataPorExtenso = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const feitas = painel.actionsDoneToday
  const total = feitas + pendentes.length
  const fechado = Number(painel.closedThisMonth.value)
  const ouro = Math.min(painel.streakDays, SEMANA_DE_OURO)

  return (
    <section
      aria-label="Placar do dia"
      className="flex flex-col gap-6 rounded-2xl border border-border border-t-[3px] border-t-leadnexi-violet bg-card p-6 lg:sticky lg:top-20 lg:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[13px] font-semibold text-muted-foreground">{maiuscula(dataPorExtenso)}</p>
          <h1 className="mb-0 mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
            {nome ? `${saudacao}, ${nome}` : saudacao}
          </h1>
        </div>
        <span
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-extrabold',
            painel.streakDays > 0 ? 'bg-warn text-warn-foreground' : 'bg-muted text-muted-foreground',
          )}
          title="Dias seguidos batendo a meta de novos contatos"
        >
          <Flame aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          {painel.streakDays} {painel.streakDays === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      <AnelDeProgresso feitas={feitas} total={total} />
      <p className="-mt-2 mb-0 text-center text-xl font-extrabold text-foreground" aria-live="polite">
        {fraseDoProgresso(feitas, total, pendentes[0])}
      </p>
      <Button className={cn(botaoPrincipalDoTopo, 'h-[52px] w-full text-base')} onClick={onComecar} disabled={pendentes.length === 0}>
        <Play aria-hidden className="h-[18px] w-[18px] fill-current" strokeWidth={1.75} />
        Começar a fila
      </Button>

      <SemanaDaMeta painel={painel} />

      <dl className="m-0 grid grid-cols-3 gap-2.5">
        <Numero
          valor={String(painel.responsesThisWeek)}
          rotulo="respostas na semana"
          cor={painel.responsesThisWeek > 0 ? 'text-leadnexi-cyan-texto' : 'text-muted-foreground'}
        />
        <Numero valor={String(painel.contactsMade)} sufixo={`/${painel.weeklyTarget}`} rotulo="contatos na semana" cor="text-foreground" />
        <Numero
          valor={formatarReais(fechado)}
          rotulo={`fechado no mês · meta ${formatarReais(painel.monthlyGoal)}`}
          cor={fechado > 0 ? 'text-success-foreground' : 'text-muted-foreground'}
        />
      </dl>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
            <Trophy aria-hidden className="h-4 w-4 text-warn-foreground" strokeWidth={1.75} />
            Próxima conquista
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
            {ouro >= SEMANA_DE_OURO ? 'Conquistada!' : `${ouro} de ${SEMANA_DE_OURO} dias`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan transition-[width] duration-500"
            style={{ width: `${(ouro / SEMANA_DE_OURO) * 100}%` }}
          />
        </div>
        <span className="text-[13px] font-medium text-muted-foreground">
          Bata a meta {SEMANA_DE_OURO} dias seguidos e ganhe a "Semana de ouro".
        </span>
      </div>
    </section>
  )
}

/** Semana de segunda a domingo: dia com a meta batida em violeta com ✓; hoje tracejado em ciano. */
export function SemanaDaMeta({ painel }: { painel: PainelDeHoje }) {
  const hoje = hojeEmFortaleza()
  return (
    <ol aria-label={`Semana: meta de ${painel.dailyTarget} novos contatos por dia`} className="flex justify-between gap-1">
      {painel.week.map((dia, i) => {
        const bateu = dia.firstContacts >= painel.dailyTarget
        const ehHoje = dia.date === hoje
        return (
          <li key={dia.date} className="flex flex-col items-center gap-1.5 text-xs font-bold text-muted-foreground" title={`${dia.firstContacts} novos contatos`}>
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full',
                bateu
                  ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent'
                  : ehHoje
                    ? 'border-2 border-dashed border-leadnexi-cyan'
                    : 'bg-muted',
              )}
            >
              {bateu ? (
                <Check aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.25} />
              ) : (
                dia.firstContacts > 0 && <span className="text-[13px] font-extrabold tabular-nums text-foreground">{dia.firstContacts}</span>
              )}
            </span>
            <span className={ehHoje ? 'text-foreground' : undefined}>{DIAS_DA_SEMANA[i]}</span>
            <span className="sr-only">{bateu ? 'meta batida' : `${dia.firstContacts} contatos`}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function AnelDeProgresso({ feitas, total }: { feitas: number; total: number }) {
  const raio = 88
  const circunferencia = 2 * Math.PI * raio
  const proporcao = total > 0 ? Math.min(feitas / total, 1) : 0
  return (
    <div className="relative mx-auto h-56 w-56 sm:h-60 sm:w-60" role="img" aria-label={`${feitas} de ${total} ações feitas hoje`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="anel-de-hoje" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--leadnexi-violet))" />
            <stop offset="1" stopColor="hsl(var(--leadnexi-cyan))" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={raio} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          stroke="url(#anel-de-hoje)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - proporcao)}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
          style={{ opacity: proporcao === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <p className="m-0 text-[72px] font-extrabold leading-none tracking-[-0.05em] tabular-nums text-foreground">
          {feitas}
          <span className="text-[28px] font-bold tracking-normal text-muted-foreground">/{total}</span>
        </p>
        <p className="m-0 text-sm font-bold text-muted-foreground">ações hoje</p>
      </div>
    </div>
  )
}

export function Numero({ valor, sufixo, rotulo, cor }: { valor: string; sufixo?: string; rotulo: string; cor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border bg-muted/40 p-3">
      <dd className={cn('m-0 truncate text-xl font-extrabold tabular-nums', cor)}>
        {valor}
        {sufixo && <span className="text-[13px] font-bold text-muted-foreground">{sufixo}</span>}
      </dd>
      <dt className="text-xs font-bold leading-snug text-muted-foreground">{rotulo}</dt>
    </div>
  )
}

export type AcoesDaMissao = { onAbrir: (lead: LeadDoPainel) => void; onMudou: () => void }

export function CardDeMissao({
  tipo,
  lead,
  onAbrir,
  onMudou,
  aberto = false,
}: { tipo: TipoMissao; lead: LeadDoPainel; aberto?: boolean } & AcoesDaMissao) {
  const [mensagem, setMensagem] = useState(() => mensagemSugerida(lead, tipo))
  const [editando, setEditando] = useState(aberto)
  const temMensagem = tipo === 'new' || tipo === 'follow-up'
  const contexto = contextoDaMissao(lead, tipo)
  const { feita, ocupado, podeMarcar, concluir, marcarFeita } = useConcluirMissao(lead, tipo, onMudou)

  return (
    <article
      className={cn(
        'rounded-xl border bg-card p-4 transition-[opacity,border-color] duration-300',
        tipo === 'response' ? 'border-leadnexi-cyan/50' : 'border-border hover:border-foreground/20',
        feita && 'opacity-45',
      )}
    >
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAbrir(lead)}
              className={cn('cursor-pointer truncate text-left text-base font-extrabold text-foreground hover:underline', feita && 'line-through')}
            >
              {lead.name}
            </button>
            <EtiquetasDoLead lead={lead} />
          </div>
          <span className={cn('text-[13px] font-bold', contexto.cor)}>{contexto.texto}</span>
          {temMensagem && !editando && <span className="truncate text-sm font-medium text-muted-foreground">{mensagem}</span>}
          {temMensagem && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => setEditando((v) => !v)}
                className="cursor-pointer text-[13px] font-bold text-muted-foreground hover:text-foreground"
              >
                {editando ? 'Fechar mensagem' : 'Editar mensagem'}
              </button>
              <MenuAdiar leadId={lead.id} onAdiado={onMudou} />
            </div>
          )}
        </div>
        <div className="flex w-full shrink-0 items-center gap-2.5 sm:w-auto">
          {tipo === 'response' && (
            <Button className={cn(botaoPrincipalDoTopo, 'h-11 flex-1 sm:flex-none')} onClick={() => onAbrir(lead)}>
              <MessageCircle aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
              Responder
            </Button>
          )}
          {tipo === 'meeting' && (
            <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11 flex-1 sm:flex-none')} onClick={() => onAbrir(lead)}>
              Abrir
            </Button>
          )}
          {temMensagem && (
            <BotaoWhatsApp
              lead={lead}
              mensagem={mensagem}
              className="flex-1 sm:flex-none"
              onEnviado={marcarFeita}
            />
          )}
          {podeMarcar && (
            <button
              type="button"
              onClick={() => void concluir(mensagem)}
              disabled={ocupado || feita}
              aria-label={tipo === 'new' ? `Já mandei a 1ª mensagem para ${lead.name}` : `Marcar follow-up de ${lead.name} como feito`}
              title={tipo === 'new' ? 'Já mandei' : 'Feito'}
              className={cn(
                'grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
                feita
                  ? 'border-success-foreground bg-success-foreground text-card'
                  : 'border-border text-muted-foreground hover:border-success-foreground hover:text-success-foreground',
              )}
            >
              <Check aria-hidden className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      {temMensagem && editando && (
        <div className="mt-4">
          <label>
            <span className="sr-only">Mensagem para {lead.name}</span>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium leading-6 text-foreground outline-none focus:border-leadnexi-violet/60"
            />
          </label>
        </div>
      )}
    </article>
  )
}

export function EtiquetasDoLead({ lead }: { lead: LeadDoPainel }) {
  return (
    <>
      {lead.adStatus === 'anuncia' && (
        <span className="rounded-full bg-leadnexi-violet/15 px-2 py-0.5 text-[11px] font-extrabold text-leadnexi-violet-texto">Anuncia</span>
      )}
      {lead.phoneType === 'fixo' && (
        <span className="rounded-full bg-warn px-2 py-0.5 text-[11px] font-extrabold text-warn-foreground">Fixo · talvez sem WhatsApp</span>
      )}
      {lead.isNetwork && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-extrabold text-muted-foreground">Rede</span>}
    </>
  )
}

/** Adia o próximo contato (amanhã, em 3 dias ou próxima segunda, às 10h). */
export function MenuAdiar({ leadId, onAdiado, className }: { leadId: string; onAdiado: () => void; className?: string }) {
  const [agora] = useState(() => new Date())
  const opcoes = [
    { rotulo: 'Amanhã', dias: 1 },
    { rotulo: 'Em 3 dias', dias: 3 },
    { rotulo: 'Próxima segunda', dias: null },
  ] as const

  const adiar = async (dias: number | null) => {
    const data = new Date(agora)
    if (dias === null) data.setDate(data.getDate() + ((8 - data.getDay()) % 7 || 7))
    else data.setDate(data.getDate() + dias)
    data.setHours(10, 0, 0, 0)
    try {
      await agendarContato(leadId, data.toISOString())
      addToast('success', 'Contato adiado', formatarDiaEHora(data.toISOString()))
      onAdiado()
    } catch {
      addToast('error', 'Não foi possível adiar', 'Tente de novo.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn('cursor-pointer text-[13px] font-bold text-muted-foreground hover:text-foreground', className)}>
          Adiar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="font-marca">
        {opcoes.map((opcao) => (
          <DropdownMenuItem key={opcao.rotulo} onSelect={() => void adiar(opcao.dias)} className="font-medium">
            {opcao.rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Um lead por vez, em tela cheia: ← → percorre, Enter abre, Esc fecha; no celular, deslizar. */
export function ModoFila({ itens, onFechar, onAbrir, onMudou }: { itens: Missao[]; onFechar: () => void } & AcoesDaMissao) {
  const [indice, setIndice] = useState(0)
  const item = itens[Math.min(indice, itens.length - 1)]
  const inicioX = useRef<number | null>(null)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const avancar = (mensagem: string) => {
    setAviso(mensagem)
    window.setTimeout(() => {
      setAviso('')
      setIndice((atual) => Math.min(atual + 1, itens.length - 1))
    }, 180)
  }

  const proxima = async () => {
    if (!item || ocupado) return
    if (item.tipo === 'follow-up') {
      setOcupado(true)
      try {
        await concluirContato(item.lead.id)
        onMudou()
        avancar('Contato marcado como feito')
      } catch {
        addToast('error', 'Não foi possível registrar', 'Tente de novo.')
      } finally {
        setOcupado(false)
      }
      return
    }
    avancar('Ação concluída')
  }

  const adiarParaAmanha = async () => {
    if (!item || ocupado) return
    const data = new Date()
    data.setDate(data.getDate() + 1)
    data.setHours(10, 0, 0, 0)
    setOcupado(true)
    try {
      await agendarContato(item.lead.id, data.toISOString())
      onMudou()
      avancar('Contato adiado para amanhã')
    } catch {
      addToast('error', 'Não foi possível adiar', 'Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const aoTocar = (e: TouchEvent<HTMLDivElement>) => {
    inicioX.current = e.changedTouches[0]?.clientX ?? null
  }

  const aoSoltar = (e: TouchEvent<HTMLDivElement>) => {
    const inicial = inicioX.current
    const final = e.changedTouches[0]?.clientX
    inicioX.current = null
    if (inicial === null || final === undefined || Math.abs(final - inicial) < 64) return
    if (final > inicial) void proxima()
    else void adiarParaAmanha()
  }

  useEffect(() => {
    const aoTeclar = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowRight') setIndice((atual) => Math.min(atual + 1, itens.length - 1))
      if (e.key === 'ArrowLeft') setIndice((atual) => Math.max(atual - 1, 0))
      if (e.key === 'Enter' && item) onAbrir(item.lead)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [item, itens.length, onFechar, onAbrir])

  if (!item) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-foreground/60 p-4 font-marca" role="dialog" aria-modal="true" aria-label="Modo fila">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-lg sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 text-[13px] font-bold text-leadnexi-cyan-texto">
            Fila de hoje · {indice + 1} de {itens.length}
          </p>
          <button
            type="button"
            onClick={onFechar}
            className="cursor-pointer rounded-md px-2 py-1 text-[13px] font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Esc para fechar
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan transition-[width] duration-300"
            style={{ width: `${((indice + 1) / itens.length) * 100}%` }}
          />
        </div>
        <div className="mt-5" onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
          <CardDeMissao key={item.lead.id} tipo={item.tipo} lead={item.lead} onAbrir={onAbrir} onMudou={onMudou} aberto />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11')} onClick={adiarParaAmanha} disabled={ocupado}>
            <span aria-hidden>←</span> Adiar para amanhã
          </Button>
          <Button className={cn(botaoPrincipalDoTopo, 'h-11')} onClick={proxima} disabled={ocupado}>
            Próxima <span aria-hidden>→</span>
          </Button>
        </div>
        <p className="mb-0 mt-3 text-center text-xs font-semibold text-muted-foreground">
          No celular, deslize para a esquerda para adiar ou para a direita para seguir. Enter abre o lead · ← → percorre a fila · Esc fecha
        </p>
        <p className="sr-only" aria-live="polite">
          {aviso}
        </p>
      </div>
    </div>
  )
}

export function FilaVazia({ feitasHoje }: { feitasHoje: number }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leadnexi-violet-600 text-leadnexi-on-accent">
        <Trophy aria-hidden className="h-[26px] w-[26px]" strokeWidth={1.75} />
      </span>
      <p className="mb-0 mt-4 text-2xl font-extrabold text-foreground">{feitasHoje > 0 ? 'Missões do dia completas' : 'Fila zerada'}</p>
      <p className="mx-auto mb-0 mt-2 max-w-md text-base text-muted-foreground">
        {feitasHoje > 0
          ? `${feitasHoje} ${feitasHoje === 1 ? 'ação feita' : 'ações feitas'} hoje. Amanhã a fila nova chega sozinha.`
          : 'Nenhuma ação pendente agora. Que tal puxar novas lojas da lista ativa?'}
      </p>
    </div>
  )
}

export function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando placar do dia" className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:gap-7">
      <div className="h-[640px] animate-pulse rounded-2xl border border-border bg-card" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  )
}

/** Ícone do canal de origem do lead, com o nome no tooltip (mesmo ícone do quadro do CRM). */
export function OrigemDoLead({ origem }: { origem: string | null }) {
  if (!origem) return null
  const { Icone, cor } = iconeDaOrigem(origem)
  return (
    <span title={`Origem: ${origem}`} className="inline-flex shrink-0">
      <Icone aria-hidden strokeWidth={1.75} className={cn('h-4 w-4', cor)} />
      <span className="sr-only">Origem: {origem}</span>
    </span>
  )
}

/** Círculo de concluído (follow-up feito, ou 1ª mensagem já mandada). */
export function CirculoConcluir({
  lead,
  tipo,
  feita,
  ocupado,
  onConcluir,
}: {
  lead: LeadDoPainel
  tipo: TipoMissao
  feita: boolean
  ocupado: boolean
  onConcluir: () => void
}) {
  return (
    <button
      type="button"
      onClick={onConcluir}
      disabled={ocupado || feita}
      aria-label={tipo === 'new' ? `Já mandei a 1ª mensagem para ${lead.name}` : `Marcar follow-up de ${lead.name} como feito`}
      title={tipo === 'new' ? 'Já mandei' : 'Feito'}
      className={cn(
        'grid shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
        'h-12 w-12',
        feita
          ? 'border-success-foreground bg-success-foreground text-card'
          : 'border-border text-muted-foreground hover:border-success-foreground hover:text-success-foreground',
      )}
    >
      <Check aria-hidden className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}

