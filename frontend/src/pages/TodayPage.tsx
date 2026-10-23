import {
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  MessageCircle,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../components/ui/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { useMe } from '../features/auth/hooks.ts'
import { MessageSuggestions } from '../features/ai/components/MessageSuggestions.tsx'
import { ClientReminders } from '../features/clients/components/ClientReminders.tsx'
import { ConversationButton } from '../features/conversations/components/ConversationButton.tsx'
import { AttachExample } from '../features/instagram/components/AttachExample.tsx'
import type { MessageOrigin } from '../features/leads/api.ts'
import { LeadAvatar } from '../features/leads/components/LeadAvatar.tsx'
import { LeadFormDialog, type LeadFormTarget } from '../features/leads/components/LeadFormDialog.tsx'
import { WhatsAppCadenceAction } from '../features/leads/components/WhatsAppCadenceAction.tsx'
import { useCompleteFollowUp, useScheduleFollowUp, useTodayDashboard } from '../features/leads/hooks.ts'
import type { LeadWithStage, TodayDashboard } from '../features/leads/types.ts'
import { useStageOptions } from '../features/pipelines/useStageOptions.ts'
import {
  defaultWhatsAppMessage,
  formatCurrency,
  formatDateTime,
  formatDay,
  formatElapsed,
  formatPercent,
} from '../lib/format.ts'

type QueueKind = 'response' | 'follow-up' | 'new' | 'meeting'
type QueueItem = { kind: QueueKind; lead: LeadWithStage }

const SECTION_META: Record<QueueKind, { title: string; subtitle: string; tone: string; icon: LucideIcon }> = {
  response: { title: 'Responder', subtitle: 'Leads que pediram sua atenção', tone: 'text-danger', icon: MessageCircle },
  'follow-up': { title: 'Follow-ups', subtitle: 'Vencidos e previstos para hoje', tone: 'text-warning', icon: Clock3 },
  new: { title: 'Novos contatos', subtitle: 'Próximas lojas da lista ativa', tone: 'text-success', icon: Sparkles },
  meeting: { title: 'Compromissos', subtitle: 'Reuniões e próximos passos', tone: 'text-cyan', icon: CalendarDays },
}

export function TodayPage() {
  const dashboard = useTodayDashboard()
  const { data: user } = useMe()
  const { stageOptions } = useStageOptions()
  const [target, setTarget] = useState<LeadFormTarget | null>(null)
  // "Começar" na fila do funil (/hoje?prospectar=1) abre já no modo prospecção, com os novos contatos
  const [searchParams, setSearchParams] = useSearchParams()
  const [focusMode, setFocusMode] = useState<'all' | 'new' | null>(() => (searchParams.has('prospectar') ? 'new' : null))
  const queue = useMemo(() => (dashboard.data ? makeQueue(dashboard.data) : []), [dashboard.data])
  useEffect(() => {
    if (searchParams.has('prospectar')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])
  const newItems = queue.filter((item) => item.kind === 'new')
  const focusItems = focusMode === 'new' && newItems.length > 0 ? newItems : queue
  const [date] = useState(() => new Date())
  const greeting = date.getHours() < 12 ? 'Bom dia' : date.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const name = user?.name?.split(' ')[0] ?? 'Benedito'
  const summary = dashboard.data
    ? `Hoje: ${dashboard.data.todayNewContacts} novos contatos, ${dashboard.data.todayFollowUps} follow-ups e ${dashboard.data.responseQueueCount} ${dashboard.data.responseQueueCount === 1 ? 'resposta pra tratar' : 'respostas pra tratar'}.`
    : 'Organizando sua fila de prospecção…'

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={`${greeting}, ${name} ☀️`}
        description={`${capitalize(formattedDate)} · ${summary}`}
        actions={
          <Button variant="secondary" className="h-10 px-3.5" onClick={() => setFocusMode('all')} disabled={queue.length === 0}>
            <Target aria-hidden size={16} strokeWidth={1.75} />
            Modo prospecção
          </Button>
        }
      />

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError || !dashboard.data ? (
        <div className="rounded-lg border border-danger/40 bg-navy-800 p-6">
          <p className="flex items-center gap-2 text-ui font-bold text-white">
            <CircleAlert aria-hidden size={18} className="text-danger" />
            Não foi possível montar sua manhã.
          </p>
          <p className="mt-1 text-small text-slate-400">Tente carregar os dados novamente.</p>
          <Button variant="secondary" className="mt-4 h-9 px-3.5" onClick={() => void dashboard.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <>
          <Scoreboard data={dashboard.data} />
          <main aria-labelledby="today-queue-title" className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="today-queue-title" className="text-h2">Sua fila de hoje</h2>
                <p className="mt-1 text-small text-slate-400">Ações em ordem de prioridade. Uma conversa de cada vez.</p>
              </div>
              <span className="hidden rounded-full bg-cyan-tint px-3 py-1 text-small font-bold text-cyan sm:inline-flex">
                {queue.length} {queue.length === 1 ? 'ação' : 'ações'}
              </span>
            </div>
            <ClientReminders />
            {queue.length === 0 ? (
              <EmptyQueue />
            ) : (
              (['response', 'follow-up', 'new', 'meeting'] as QueueKind[]).map((kind) => {
                const items = queue.filter((item) => item.kind === kind)
                return items.length > 0 ? <QueueSection key={kind} kind={kind} items={items} onOpen={(lead) => setTarget({ mode: 'edit', lead })} /> : null
              })
            )}
          </main>
        </>
      )}

      <LeadFormDialog target={target} stages={stageOptions} onClose={() => setTarget(null)} />
      {focusMode && focusItems.length > 0 && <FocusMode items={focusItems} onClose={() => setFocusMode(null)} onOpen={(lead) => setTarget({ mode: 'edit', lead })} />}
    </div>
  )
}

function makeQueue(data: TodayDashboard): QueueItem[] {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const responses = data.responses.map((lead) => ({ kind: 'response' as const, lead }))
  const followUps = data.followUps
    .filter((lead) => lead.followUpAt && new Date(lead.followUpAt).getTime() <= today.getTime() && lead.stage.stageType !== 'RESPONDED')
    .map((lead) => ({ kind: 'follow-up' as const, lead }))
  const newContacts = data.newContacts.map((lead) => ({ kind: 'new' as const, lead }))
  const meetings = data.meetings.map((lead) => ({ kind: 'meeting' as const, lead }))
  return [...responses, ...followUps, ...newContacts, ...meetings]
}

function Scoreboard({ data }: { data: TodayDashboard }) {
  const closedValue = Number(data.closedThisMonth.value)
  return (
    <section aria-label="Placar de progresso" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ScoreCard icon={Sparkles} label="Contatos feitos" value={`${data.contactsMade} / ${data.weeklyTarget}`} hint="nesta semana" progress={data.contactsMade / data.weeklyTarget} tone="violet" />
      <ScoreCard icon={MessageCircle} label="Respostas" value={String(data.responsesThisWeek)} hint={data.responseRate === null ? 'sem taxa ainda' : `${formatPercent(data.responseRate)} dos contatos`} tone="cyan" />
      <ScoreCard icon={CalendarDays} label="Reuniões marcadas" value={String(data.meetingsThisWeek)} hint="nesta semana" tone="success" />
      <ScoreCard icon={Target} label="Fechado no mês" value={formatCurrency(closedValue)} hint={`${data.closedThisMonth.count} ${data.closedThisMonth.count === 1 ? 'negócio' : 'negócios'} · meta ${formatCurrency(data.monthlyGoal)}`} progress={closedValue / data.monthlyGoal} tone="warning" />
    </section>
  )
}

function ScoreCard({ icon: Icon, label, value, hint, progress, tone }: { icon: LucideIcon; label: string; value: string; hint: string; progress?: number; tone: 'violet' | 'cyan' | 'success' | 'warning' }) {
  const iconTone = { violet: 'text-violet-300 bg-violet-tint', cyan: 'text-cyan bg-cyan-tint', success: 'text-success bg-success/10', warning: 'text-warning bg-warning/10' }[tone]
  const barTone = { violet: 'bg-violet-500', cyan: 'bg-cyan', success: 'bg-success', warning: 'bg-warning' }[tone]
  return (
    <article className="rounded-lg border bg-navy-750 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-8 place-items-center rounded-sm ${iconTone}`}><Icon aria-hidden size={16} strokeWidth={1.75} /></span>
        <span className="text-right text-xs font-bold text-slate-400">{hint}</span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-small font-semibold text-slate-300">{label}</p>
      {progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-600" aria-label={`${Math.round(Math.min(progress, 1) * 100)}% da meta`}><span className={`block h-full rounded-full ${barTone}`} style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} /></div>}
    </article>
  )
}

function QueueSection({ kind, items, onOpen }: { kind: QueueKind; items: QueueItem[]; onOpen: (lead: LeadWithStage) => void }) {
  const meta = SECTION_META[kind]
  const Icon = meta.icon
  return (
    <section aria-labelledby={`queue-${kind}`} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1"><Icon aria-hidden size={17} strokeWidth={1.75} className={meta.tone} /><h3 id={`queue-${kind}`} className="text-ui font-bold text-white">{meta.title}</h3><span className="rounded-full bg-navy-700 px-2 py-0.5 text-xs font-bold text-slate-300 tabular-nums">{items.length}</span><span className="hidden text-small text-slate-500 sm:inline">{meta.subtitle}</span></div>
      <div className="grid gap-2 xl:grid-cols-2">{items.map(({ lead }) => <ActionCard key={`${kind}-${lead.id}`} kind={kind} lead={lead} onOpen={onOpen} />)}</div>
    </section>
  )
}

function ActionCard({ kind, lead, onOpen }: { kind: QueueKind; lead: LeadWithStage; onOpen: (lead: LeadWithStage) => void }) {
  const complete = useCompleteFollowUp(lead.id)
  const [message, setMessage] = useState(() => suggestedMessage(lead, kind))
  const [origin, setOrigin] = useState<MessageOrigin | undefined>()
  const context = kind === 'response' ? `Respondeu ${formatElapsed(lead.updatedAt)}` : kind === 'follow-up' ? `${lead.cadenceStep === 2 ? 'Follow-up final' : 'Follow-up 1'} · ${lead.followUpAt ? formatDay(new Date(lead.followUpAt)) : 'hoje'}` : kind === 'meeting' ? `Reunião marcada · ${lead.meetingAt ? formatDateTime(lead.meetingAt) : 'a confirmar'}` : '1ª mensagem · novo contato'

  return (
    <article className="rounded-lg border bg-navy-800 p-4 transition-colors hover:border-navy-600">
      <div className="flex items-start gap-3">
        <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
        <button type="button" onClick={() => onOpen(lead)} className="min-w-0 flex-1 cursor-pointer text-left"><span className="block truncate text-ui font-bold text-white">{lead.name}</span><span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-slate-400">{lead.neighborhood && <span>{lead.neighborhood}</span>}{lead.googleRating !== null && <span>★ {lead.googleRating.toFixed(1)} ({lead.googleReviewCount ?? 0})</span>}</span></button>
        <LeadTags lead={lead} />
      </div>
      <p className="mt-3 flex items-center gap-2 text-small font-bold text-slate-300"><span className="size-2 rounded-full bg-cyan" aria-hidden />{context}</p>
      {(kind === 'new' || kind === 'follow-up') && <label className="mt-3 block"><span className="sr-only">Mensagem sugerida para {lead.name}</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} maxLength={5000} className="w-full resize-y rounded-md border border-navy-600 bg-navy-750 px-3 py-2 text-small leading-5 text-slate-300 outline-none placeholder:text-slate-500 focus:border-cyan" /></label>}
      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {(kind === 'new' || kind === 'follow-up') && <WhatsAppCadenceAction lead={lead} message={message} origin={origin} showLabel className="!h-11 w-full sm:!h-9 sm:w-auto" />}
        {lead.instagramUserId && <ConversationButton lead={lead} />}
        {(kind === 'response' || kind === 'meeting') && <Button variant="secondary" className="h-9 px-3.5" onClick={() => onOpen(lead)}>{kind === 'response' ? 'Tratar resposta' : 'Abrir compromisso'}</Button>}
        {kind === 'follow-up' && <Button variant="secondary" className="h-9 px-3.5" onClick={() => complete.mutate()} disabled={complete.isPending}>{complete.isPending ? 'Salvando…' : <><Check aria-hidden size={16} strokeWidth={1.75} /> Feito</>}</Button>}
        {(kind === 'new' || kind === 'follow-up') && <DelayMenu leadId={lead.id} />}
        {kind === 'follow-up' && <AttachExample message={message} onChange={setMessage} />}
      </div>
      {(kind === 'new' || kind === 'follow-up') && lead.phone && (
        <div className="mt-3">
          <MessageSuggestions
            lead={lead}
            onPick={(text, picked) => {
              setMessage(text)
              setOrigin(picked)
            }}
          />
        </div>
      )}
      {complete.error && <p className="mt-2 text-small text-danger">Não foi possível marcar como feito.</p>}
    </article>
  )
}

function LeadTags({ lead }: { lead: LeadWithStage }) {
  return <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">{lead.adStatus === 'anuncia' && <span className="rounded-full bg-violet-tint px-2 py-0.5 text-[10px] font-bold text-violet-300">Anuncia</span>}{lead.phoneType === 'fixo' && <span className="rounded-full bg-slate-tint px-2 py-0.5 text-[10px] font-bold text-slate-300">Fixo</span>}{lead.isNetwork && <span className="rounded-full bg-cyan-tint px-2 py-0.5 text-[10px] font-bold text-cyan">Rede</span>}</div>
}

function DelayMenu({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false)
  const [baseDate] = useState(() => new Date())
  const schedule = useScheduleFollowUp(leadId)
  const choices = [{ label: 'Amanhã', days: 1 }, { label: 'Em 3 dias', days: 3 }, { label: 'Próxima segunda', days: null }] as const
  function choose(days: number | null) {
    const date = new Date(baseDate)
    if (days === null) date.setDate(date.getDate() + (((8 - date.getDay()) % 7) || 7))
    else date.setDate(date.getDate() + days)
    date.setHours(10, 0, 0, 0)
    schedule.mutate({ dueAt: date.toISOString(), note: 'Contato adiado pela fila de hoje' }, { onSuccess: () => setOpen(false) })
  }
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="relative"><summary className="flex h-9 cursor-pointer list-none items-center rounded-sm border border-navy-600 px-3 text-small font-bold text-slate-300 hover:bg-navy-750">Adiar</summary><div className="absolute top-10 left-0 z-10 flex min-w-40 flex-col gap-1 rounded-md border border-navy-600 bg-navy-800 p-1 shadow-float">{choices.map((choice) => <button key={choice.label} type="button" className="cursor-pointer rounded-sm px-3 py-2 text-left text-small font-semibold text-slate-300 hover:bg-navy-750 hover:text-white" onClick={() => choose(choice.days)} disabled={schedule.isPending}>{choice.label}</button>)}</div></details>
}

function FocusMode({ items, onClose, onOpen }: { items: QueueItem[]; onClose: () => void; onOpen: (lead: LeadWithStage) => void }) {
  const [index, setIndex] = useState(0)
  const item = items[index]
  const startX = useRef<number | null>(null)
  const [gestureMessage, setGestureMessage] = useState('')
  const complete = useCompleteFollowUp(item?.lead.id ?? '')
  const schedule = useScheduleFollowUp(item?.lead.id ?? '')

  function advance(message: string) {
    setGestureMessage(message)
    window.setTimeout(() => {
      setGestureMessage('')
      setIndex((current) => Math.min(current + 1, items.length - 1))
    }, 180)
  }

  function markDone() {
    if (!item || complete.isPending) return
    if (item.kind === 'follow-up') {
      complete.mutate(undefined, { onSuccess: () => advance('Contato marcado como feito') })
      return
    }
    advance('Ação concluída')
  }

  function postpone() {
    if (!item || schedule.isPending) return
    const dueAt = new Date()
    dueAt.setDate(dueAt.getDate() + 1)
    dueAt.setHours(10, 0, 0, 0)
    schedule.mutate({ dueAt: dueAt.toISOString(), note: 'Contato adiado pelo modo prospecção' }, { onSuccess: () => advance('Contato adiado para amanhã') })
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    startX.current = event.changedTouches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const initialX = startX.current
    const finalX = event.changedTouches[0]?.clientX
    startX.current = null
    if (initialX === null || finalX === undefined) return
    const distance = finalX - initialX
    if (Math.abs(distance) < 64) return
    if (distance > 0) markDone()
    else postpone()
  }

  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(current + 1, items.length - 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(current - 1, 0))
      if (event.key === 'Enter' && item) onOpen(item.lead)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [item, items.length, onClose, onOpen])
  if (!item) return null
  return <div className="fixed inset-0 z-40 grid place-items-center bg-backdrop p-4" role="dialog" aria-modal="true" aria-label="Modo prospecção"><div className="w-full max-w-2xl rounded-xl border border-navy-600 bg-navy-800 p-5 shadow-float sm:p-8"><div className="flex items-center justify-between gap-4"><p className="text-small font-bold text-cyan">Modo prospecção · {index + 1} de {items.length}</p><button type="button" onClick={onClose} className="cursor-pointer rounded-sm px-2 py-1 text-small font-bold text-slate-400 hover:bg-navy-750 hover:text-white">Esc para fechar</button></div><div className="mt-5" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}><ActionCard kind={item.kind} lead={item.lead} onOpen={onOpen} /></div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center"><Button variant="secondary" className="h-11 sm:h-9" onClick={postpone} disabled={schedule.isPending}><span aria-hidden>←</span> Adiar para amanhã</Button><Button className="h-11 sm:h-9" onClick={markDone} disabled={complete.isPending || schedule.isPending}>Feito <span aria-hidden>→</span></Button></div><p className="mt-3 text-center text-xs font-semibold text-slate-500">No celular, deslize para a esquerda para adiar ou para a direita para concluir. Enter abre o lead · ← → percorre a fila · Esc fecha</p><p className="sr-only" aria-live="polite">{gestureMessage}</p></div></div>
}

function EmptyQueue() {
  return <div className="rounded-xl border border-dashed border-cyan/40 bg-cyan/5 px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-cyan-tint text-cyan"><Sparkles aria-hidden size={24} /></span><p className="mt-4 text-h2 text-white">Fila zerada 🎉</p><p className="mx-auto mt-2 max-w-md text-body text-slate-400">Você não tem ações pendentes agora. Aproveite para puxar novas lojas da lista ativa ou revisar o funil.</p></div>
}

function DashboardSkeleton() {
  return <div aria-busy="true" aria-label="Carregando painel da manhã" className="flex flex-col gap-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg border bg-navy-800" />)}</div><div className="h-48 animate-pulse rounded-lg border bg-navy-800" /></div>
}

function suggestedMessage(lead: LeadWithStage, kind: QueueKind): string {
  if (kind === 'follow-up' && lead.cadenceStep === 1) return `Oi! Só retomando a mensagem de ${formatDay(new Date(lead.updatedAt))}. Se fizer sentido, te mando um exemplo de anúncio pra ${lead.name}, sem compromisso. Se não for o momento, tudo bem também.`
  if (kind === 'follow-up' && lead.cadenceStep === 2) return `Última mensagem pra não te incomodar 🙂 Se um dia quiser uma análise grátis dos anúncios da ${lead.name}, é só me chamar aqui.`
  return defaultWhatsAppMessage(lead.name)
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
