import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  NotebookPen,
  Plus,
  Reply,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ComponentType, type FormEvent, type KeyboardEvent } from 'react'
import { InstagramIcon } from '../../../brand/icons.tsx'
import { Button } from '../../../components/ui/Button.tsx'
import { Drawer } from '../../../components/ui/Drawer.tsx'
import { Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { formatAgo, formatCurrency, formatDateTime, followUpTone } from '../../../lib/format.ts'
import {
  useAddLeadNote,
  useCancelFollowUp,
  useCompleteFollowUp,
  useLead,
  useLeadActivities,
  useRemoveLeadNote,
  useScheduleFollowUp,
} from '../hooks.ts'
import type { Lead, LeadActivity } from '../types.ts'
import { Conversation } from '../../conversations/components/Conversation.tsx'
import { LeadAvatar } from './LeadAvatar.tsx'
import { InstagramLink } from './InstagramLink.tsx'
import { LeadForm, type StageOption } from './LeadForm.tsx'
import { WhatsAppLink } from './WhatsAppLink.tsx'

type Tab = 'history' | 'conversation' | 'details'

// Painel do lead (BRAND.md, seção 8 · "Painel do lead"): abre à direita ao clicar num lead.
// Aba "Histórico" (padrão): próximo contato, nova anotação e linha do tempo. Aba "Conversa" (lead com
// Instagram): o direct, com resposta pelo LeadNexi. Aba "Dados": o formulário.
export function LeadPanel({
  lead: initial,
  stages,
  onClose,
}: {
  lead: Lead | null
  stages: StageOption[]
  onClose: () => void
}) {
  return (
    <Drawer open={initial !== null} onClose={onClose} label={initial ? `Lead ${initial.name}` : 'Lead'}>
      {initial && <PanelContent initial={initial} stages={stages} onClose={onClose} />}
    </Drawer>
  )
}

function PanelContent({ initial, stages, onClose }: { initial: Lead; stages: StageOption[]; onClose: () => void }) {
  const { data: lead = initial } = useLead(initial.id, initial)
  const [tab, setTab] = useState<Tab>('history')
  const stage = stages.find((option) => option.id === lead.stageId)

  return (
    <>
      <header className="flex items-start gap-3 border-b px-5 pt-5 pb-4">
        <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
        <div className="min-w-0 flex-1">
          <h2 className="text-h2 break-words">{lead.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-slate-400">
            {stage && (
              <span className="flex items-center gap-1.5 text-slate-300">
                {stage.colorClass && <span aria-hidden className={`size-2 rounded-full ${stage.colorClass}`} />}
                {stage.label}
              </span>
            )}
            {lead.estimatedValue && (
              <>
                <span aria-hidden>·</span>
                <span className="font-bold text-white">{formatCurrency(lead.estimatedValue)}</span>
              </>
            )}
            {lead.instagramUsername && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">@{lead.instagramUsername}</span>
              </>
            )}
          </p>
        </div>
        <InstagramLink name={lead.name} username={lead.instagramUsername} />
        <WhatsAppLink name={lead.name} phone={lead.phone} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>

      <div role="tablist" aria-label="Seções do lead" className="flex gap-1 border-b px-5">
        <TabButton current={tab} value="history" onSelect={setTab}>
          Histórico
        </TabButton>
        {(lead.instagramUserId || lead.instagramUsername) && (
          <TabButton current={tab} value="conversation" onSelect={setTab}>
            Conversa
          </TabButton>
        )}
        <TabButton current={tab} value="details" onSelect={setTab}>
          Dados
        </TabButton>
      </div>

      {tab === 'conversation' ? (
        // A conversa rola por dentro, com a caixa de texto fixa embaixo
        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
          <Conversation lead={lead} />
        </div>
      ) : (
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {tab === 'history' ? (
            <div className="flex flex-col gap-6">
              <FollowUp lead={lead} />
              <NoteComposer leadId={lead.id} />
              <Timeline leadId={lead.id} />
            </div>
          ) : (
            <LeadForm target={{ mode: 'edit', lead }} stages={stages} onDone={onClose} />
          )}
        </div>
      )}
    </>
  )
}

function TabButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: Tab
  value: Tab
  onSelect: (tab: Tab) => void
  children: string
}) {
  const selected = current === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(value)}
      className={`-mb-px cursor-pointer border-b-2 px-3 py-3 text-ui transition-colors ${
        selected ? 'border-violet font-bold text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

// ── Próximo contato ────────────────────────────────────────────────────────────

const TONE_STYLE = {
  overdue: { text: 'text-danger', label: 'Atrasado' },
  today: { text: 'text-warning', label: 'Hoje' },
  future: { text: 'text-cyan', label: null },
} as const

function FollowUp({ lead }: { lead: Lead }) {
  const [rescheduling, setRescheduling] = useState(false)
  const complete = useCompleteFollowUp(lead.id)
  const cancel = useCancelFollowUp(lead.id)

  if (!lead.followUpAt || rescheduling) {
    return (
      <section aria-labelledby="follow-up-title" className="flex flex-col gap-3">
        <SectionTitle id="follow-up-title" icon={CalendarClock}>
          {rescheduling ? 'Reagendar contato' : 'Próximo contato'}
        </SectionTitle>
        <FollowUpScheduler
          leadId={lead.id}
          initialNote={lead.followUpNote ?? ''}
          onDone={() => setRescheduling(false)}
          onCancel={rescheduling ? () => setRescheduling(false) : undefined}
        />
      </section>
    )
  }

  const tone = TONE_STYLE[followUpTone(lead.followUpAt)]
  const error = complete.error ?? cancel.error

  return (
    <section aria-labelledby="follow-up-title" className="flex flex-col gap-3">
      <SectionTitle id="follow-up-title" icon={CalendarClock}>
        Próximo contato
      </SectionTitle>
      <div className="rounded-md border bg-navy-750 p-4">
        <div className="flex items-start gap-3">
          <Bell aria-hidden size={18} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${tone.text}`} />
          <div className="min-w-0 flex-1">
            <p className="text-ui font-bold text-white">
              {formatDateTime(lead.followUpAt)}
              {tone.label && <span className={`ml-2 text-xs font-bold ${tone.text}`}>{tone.label}</span>}
            </p>
            {lead.followUpNote && <p className="mt-0.5 text-small text-slate-300">{lead.followUpNote}</p>}
          </div>
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            aria-label="Desmarcar contato"
            title="Desmarcar"
            className="-mt-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
          >
            <X aria-hidden size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 pl-7.5">
          <Button className="h-9 px-3.5" onClick={() => complete.mutate()} disabled={complete.isPending}>
            {complete.isPending ? (
              <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Check aria-hidden size={16} strokeWidth={1.75} />
            )}
            Marcar como feito
          </Button>
          <Button variant="secondary" className="h-9 px-3.5" onClick={() => setRescheduling(true)}>
            Reagendar
          </Button>
        </div>
      </div>
      {error && <ErrorText>Não foi possível atualizar o contato. Tente de novo.</ErrorText>}
    </section>
  )
}

/** Atalhos de data (9h da manhã, horário local) */
function presetDate(kind: 'tomorrow' | 'in3days' | 'nextMonday'): Date {
  const date = new Date()
  if (kind === 'tomorrow') date.setDate(date.getDate() + 1)
  if (kind === 'in3days') date.setDate(date.getDate() + 3)
  if (kind === 'nextMonday') date.setDate(date.getDate() + (((8 - date.getDay()) % 7) || 7))
  date.setHours(9, 0, 0, 0)
  return date
}

const PRESETS = [
  { kind: 'tomorrow', label: 'Amanhã' },
  { kind: 'in3days', label: 'Em 3 dias' },
  { kind: 'nextMonday', label: 'Próxima segunda' },
] as const

/** "2026-10-02T09:00" no horário local, para o <input type="datetime-local"> */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function FollowUpScheduler({
  leadId,
  initialNote,
  onDone,
  onCancel,
}: {
  leadId: string
  initialNote: string
  onDone: () => void
  onCancel?: () => void
}) {
  const [note, setNote] = useState(initialNote)
  const [custom, setCustom] = useState<string | null>(null)
  // Mínimo do campo de data: o momento em que o agendador abriu (lido uma vez, fora da renderização)
  const [minDate] = useState(() => toLocalInput(new Date()))
  const schedule = useScheduleFollowUp(leadId)

  function submit(date: Date) {
    schedule.mutate({ dueAt: date.toISOString(), note: note.trim() || undefined }, { onSuccess: onDone })
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (custom) submit(new Date(custom))
  }

  const chip =
    'h-9 cursor-pointer rounded-sm border border-navy-600 px-3 text-small text-slate-300 transition-colors hover:bg-navy-750 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-violet aria-pressed:text-white'

  return (
    <form onSubmit={submitCustom} className="flex flex-col gap-3">
      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={280}
        placeholder="O que fazer? Ex.: ligar para fechar o orçamento"
        aria-label="O que fazer no próximo contato"
      />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            className={chip}
            disabled={schedule.isPending}
            title={formatDateTime(presetDate(kind).toISOString())}
            onClick={() => submit(presetDate(kind))}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={chip}
          aria-pressed={custom !== null}
          onClick={() => setCustom(custom === null ? toLocalInput(presetDate('tomorrow')) : null)}
        >
          Outra data
        </button>
        {onCancel && (
          <button type="button" className={`${chip} border-transparent`} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
      {custom !== null && (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              type="datetime-local"
              value={custom}
              min={minDate}
              onChange={(event) => setCustom(event.target.value)}
              aria-label="Data e hora do contato"
              className="tabular-nums"
            />
          </div>
          <Button type="submit" disabled={!custom || schedule.isPending}>
            Agendar
          </Button>
        </div>
      )}
      {schedule.error && <ErrorText>Não foi possível agendar. Tente de novo.</ErrorText>}
    </form>
  )
}

// ── Nova anotação ──────────────────────────────────────────────────────────────

function NoteComposer({ leadId }: { leadId: string }) {
  const [text, setText] = useState('')
  const add = useAddLeadNote(leadId)
  const trimmed = text.trim()

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!trimmed || add.isPending) return
    add.mutate(trimmed, { onSuccess: () => setText('') })
  }

  // Ctrl/⌘ + Enter salva sem tirar a mão do teclado
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="note-title" className="flex flex-col gap-3">
      <SectionTitle id="note-title" icon={NotebookPen}>
        Nova anotação
      </SectionTitle>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={5000}
        rows={3}
        placeholder="O que foi conversado? Ex.: pediu orçamento de 3 cadeiras"
        aria-label="Texto da anotação"
        className="min-h-20 text-ui"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-400">Ctrl + Enter para salvar</span>
        <Button type="submit" className="h-9 px-3.5" disabled={!trimmed || add.isPending}>
          {add.isPending ? (
            <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Plus aria-hidden size={16} strokeWidth={1.75} />
          )}
          Anotar
        </Button>
      </div>
      {add.error && <ErrorText>Não foi possível salvar a anotação. Tente de novo.</ErrorText>}
    </form>
  )
}

// ── Linha do tempo ─────────────────────────────────────────────────────────────

function Timeline({ leadId }: { leadId: string }) {
  const activities = useLeadActivities(leadId)

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h3 id="history-title" className="text-small text-slate-400">
        Histórico
      </h3>
      {activities.isPending ? (
        <div aria-busy="true" aria-label="Carregando histórico" className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-md bg-navy-750" />
          ))}
        </div>
      ) : activities.isError ? (
        <ErrorText>Não foi possível carregar o histórico.</ErrorText>
      ) : activities.data.length === 0 ? (
        <p className="text-small text-slate-400">Nada registrado ainda.</p>
      ) : (
        <ol className="flex flex-col">
          {activities.data.map((activity, index) => (
            <TimelineItem
              key={activity.id}
              leadId={leadId}
              activity={activity}
              last={index === activities.data.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

type TimelineIcon = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>

/**
 * Ícone, cor e frase de cada tipo de evento. `bubble`: o texto é do lead ou seu (nota, mensagem)
 * e aparece num balão; `label`: de onde veio, ao lado da hora.
 */
function describe(activity: LeadActivity): {
  icon: TimelineIcon
  tone: string
  title: string
  detail?: string
  bubble?: boolean
  label?: string
} {
  switch (activity.type) {
    case 'CREATED':
      return {
        icon: Plus,
        tone: 'text-violet-300',
        title: activity.toStage ? `Lead criado em ${activity.toStage}` : 'Lead criado',
        detail: activity.text ? `Origem: ${activity.text}` : undefined,
      }
    case 'STAGE_CHANGED':
      return {
        icon: ArrowRight,
        tone: 'text-slate-300',
        title: `Movido de ${activity.fromStage ?? '—'} para ${activity.toStage ?? '—'}`,
      }
    case 'NOTE':
      return { icon: NotebookPen, tone: 'text-slate-300', title: activity.text ?? '', bubble: true }
    case 'INSTAGRAM_MESSAGE':
      return {
        icon: InstagramIcon,
        tone: 'text-violet-300',
        title: activity.text ?? '',
        bubble: true,
        label: 'Direct do Instagram',
      }
    case 'INSTAGRAM_MESSAGE_SENT':
      return {
        icon: Reply,
        tone: 'text-cyan',
        title: activity.text ?? '',
        bubble: true,
        label: 'Você respondeu no direct',
      }
    case 'FOLLOW_UP_SCHEDULED':
      return {
        icon: CalendarClock,
        tone: 'text-cyan',
        title: activity.dueAt ? `Contato agendado para ${formatDateTime(activity.dueAt)}` : 'Contato agendado',
        detail: activity.text ?? undefined,
      }
    case 'FOLLOW_UP_DONE':
      return {
        icon: CircleCheck,
        tone: 'text-success',
        title: 'Contato feito',
        detail: activity.text ?? undefined,
      }
  }
}

function TimelineItem({ leadId, activity, last }: { leadId: string; activity: LeadActivity; last: boolean }) {
  const { icon: Icon, tone, title, detail, bubble, label } = describe(activity)
  const isNote = activity.type === 'NOTE'

  return (
    <li className="group/item relative flex gap-3 pb-5 last:pb-0">
      {/* Linha vertical ligando os eventos */}
      {!last && <span aria-hidden className="absolute top-8 bottom-0 left-3.5 w-px bg-navy-700" />}
      <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-tint ${tone}`}>
        <Icon aria-hidden size={14} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={
            bubble
              ? 'rounded-md border bg-navy-750 px-3 py-2 text-ui font-medium break-words whitespace-pre-wrap text-white'
              : 'text-ui text-white'
          }
        >
          {title}
        </p>
        {detail && <p className="mt-0.5 text-small text-slate-400">{detail}</p>}
        <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
          {label && (
            <>
              <span>{label}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={activity.createdAt} title={new Date(activity.createdAt).toLocaleString('pt-BR')}>
            {formatAgo(activity.createdAt)}
          </time>
          {isNote && <RemoveNoteButton leadId={leadId} activityId={activity.id} />}
        </p>
      </div>
    </li>
  )
}

/** Apagar anotação: pede confirmação com um segundo clique. */
function RemoveNoteButton({ leadId, activityId }: { leadId: string; activityId: string }) {
  const [confirming, setConfirming] = useState(false)
  const remove = useRemoveLeadNote(leadId)

  return (
    <button
      type="button"
      disabled={remove.isPending}
      onClick={() => (confirming ? remove.mutate(activityId) : setConfirming(true))}
      onBlur={() => setConfirming(false)}
      className={`flex cursor-pointer items-center gap-1 rounded-xs px-1 transition-opacity hover:text-danger focus-visible:opacity-100 ${
        confirming ? 'text-danger opacity-100' : 'opacity-0 group-hover/item:opacity-100 [@media(hover:none)]:opacity-100'
      }`}
    >
      <Trash2 aria-hidden size={13} strokeWidth={1.75} />
      {confirming ? 'Apagar?' : <span className="sr-only">Apagar anotação</span>}
    </button>
  )
}

// ── Peças comuns ───────────────────────────────────────────────────────────────

function SectionTitle({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: string }) {
  return (
    <h3 id={id} className="flex items-center gap-2 text-ui font-bold text-white">
      <Icon aria-hidden size={16} strokeWidth={1.75} className="text-slate-400" />
      {children}
    </h3>
  )
}

function ErrorText({ children }: { children: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-small text-danger">
      <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      {children}
    </p>
  )
}
