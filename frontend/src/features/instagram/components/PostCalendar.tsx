import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, CircleAlert, GripVertical } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { ApiError } from '../../../lib/api.ts'
import { useMediaQuery } from '../../../lib/useMediaQuery.ts'
import { useCalendarPosts, useInstagramPublishing, useSyncInstagramPosts, useUpdatePost } from '../hooks.ts'
import { isPending, POST_STATUS, postDate } from '../status.ts'
import type { InstagramPost } from '../types.ts'
import { PostDetails } from './PostDetails.tsx'
import { StatusIcon } from './StatusIcon.tsx'

type Mode = 'semana' | 'mes'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** "2026-10-16" no horário local (chave do dia) */
function dayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Segunda-feira da semana da data, à meia-noite */
function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return addDays(result, -((result.getDay() + 6) % 7))
}

/** Dias mostrados: a semana, ou as semanas inteiras que cobrem o mês */
function visibleDays(mode: Mode, anchor: Date): Date[] {
  if (mode === 'semana') {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const total = Math.ceil(((last.getTime() - start.getTime()) / 86_400_000 + 1) / 7) * 7
  return Array.from({ length: total }, (_, index) => addDays(start, index))
}

/** Mesmo horário do post, no dia de destino */
function moveToDay(current: Date, day: Date) {
  const result = new Date(day)
  result.setHours(current.getHours(), current.getMinutes(), 0, 0)
  return result
}

// Calendário de conteúdo (spec F8): semana ou mês, com os posts agendados e publicados de cada dia.
// Agendado ou com falha pode ser arrastado para outro dia (mantém o horário; com falha volta a
// "Agendado"). Clicar num post abre os detalhes. No celular, os dias viram uma lista.
export function PostCalendar() {
  const [mode, setMode] = useState<Mode>('semana')
  const [anchor, setAnchor] = useState(() => new Date())
  const [openId, setOpenId] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const wide = useMediaQuery('(min-width: 768px)')
  const days = useMemo(() => visibleDays(mode, anchor), [mode, anchor])
  const from = days[0].toISOString()
  const to = addDays(days[days.length - 1], 1).toISOString()
  const posts = useCalendarPosts(from, to)
  const update = useUpdatePost()
  const publishing = useInstagramPublishing()
  useSyncInstagramPosts()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const byDay = useMemo(() => {
    const map = new Map<string, InstagramPost[]>()
    for (const post of posts.data ?? []) {
      const key = dayKey(new Date(postDate(post)))
      map.set(key, [...(map.get(key) ?? []), post])
    }
    for (const list of map.values()) list.sort((a, b) => postDate(a).localeCompare(postDate(b)))
    return map
  }, [posts.data])

  // Dia de hoje, lido uma vez (a tela não fica aberta de um dia para o outro)
  const [today] = useState(() => dayKey(new Date()))
  const title =
    mode === 'mes'
      ? anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  function shift(direction: -1 | 1) {
    setAnchor((current) =>
      mode === 'semana' ? addDays(current, 7 * direction) : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    )
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const post = posts.data?.find((item) => item.id === active.id)
    const day = days.find((item) => dayKey(item) === over.id)
    if (!post || !day || dayKey(new Date(post.scheduledAt)) === over.id) return
    const scheduledAt = moveToDay(new Date(post.scheduledAt), day)
    if (scheduledAt.getTime() < Date.now() + 60_000) {
      setMoveError('Esse horário já passou. Escolha um dia à frente.')
      return
    }
    setMoveError(null)
    update.mutate(
      { id: post.id, input: { scheduledAt: scheduledAt.toISOString() } },
      {
        onError: (error) =>
          setMoveError(error instanceof ApiError && error.status < 500 ? error.message : 'Não foi possível remarcar. Tente de novo.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <NavButton label={mode === 'semana' ? 'Semana anterior' : 'Mês anterior'} onClick={() => shift(-1)}>
            <ChevronLeft aria-hidden size={18} strokeWidth={1.75} />
          </NavButton>
          <NavButton label={mode === 'semana' ? 'Próxima semana' : 'Próximo mês'} onClick={() => shift(1)}>
            <ChevronRight aria-hidden size={18} strokeWidth={1.75} />
          </NavButton>
          <h3 className="ml-1 text-ui font-bold text-white first-letter:uppercase" aria-live="polite">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-3" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
          <div role="radiogroup" aria-label="Período do calendário" className="inline-flex gap-0.5 rounded-md border bg-navy-750 p-0.5">
            {(['semana', 'mes'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={`h-8 cursor-pointer rounded-sm px-3 text-small font-bold transition-colors ${
                  mode === value ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {value === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-small text-slate-400">
        Arraste um post agendado para outro dia: ele mantém o horário.
        {publishing.data?.automatic === false && ' A publicação automática está desligada: use "Publicar agora" na hora.'}
      </p>
      {moveError && (
        <p role="alert" className="flex items-center gap-2 text-small text-danger">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} />
          {moveError}
        </p>
      )}
      {posts.isError && <p className="text-small text-danger">Não foi possível carregar o calendário.</p>}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {wide ? (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-navy-750">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="px-2 py-2 text-xs font-bold text-slate-400">
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7" aria-busy={posts.isPending}>
              {days.map((day) => (
                <DayCell
                  key={dayKey(day)}
                  day={day}
                  posts={byDay.get(dayKey(day)) ?? []}
                  today={today}
                  outside={mode === 'mes' && day.getMonth() !== anchor.getMonth()}
                  tall={mode === 'semana'}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-2" aria-busy={posts.isPending}>
            {days
              .filter((day) => mode === 'semana' || (byDay.get(dayKey(day))?.length ?? 0) > 0 || dayKey(day) === today)
              .map((day) => (
                <li key={dayKey(day)}>
                  <DayCell
                    day={day}
                    posts={byDay.get(dayKey(day)) ?? []}
                    today={today}
                    outside={false}
                    tall={false}
                    list
                    onOpen={setOpenId}
                  />
                </li>
              ))}
          </ol>
        )}
      </DndContext>

      <PostDetails post={posts.data?.find((post) => post.id === openId)} onClose={() => setOpenId(null)} />
    </div>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-sm text-slate-300 transition-colors hover:bg-navy-750 hover:text-white"
    >
      {children}
    </button>
  )
}

function DayCell({
  day,
  posts,
  today,
  outside,
  tall,
  list = false,
  onOpen,
}: {
  day: Date
  posts: InstagramPost[]
  /** Chave do dia de hoje ("2026-10-16") */
  today: string
  outside: boolean
  tall: boolean
  list?: boolean
  onOpen: (id: string) => void
}) {
  const isToday = dayKey(day) === today
  const past = dayKey(day) < today
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day), disabled: past })
  const label = list
    ? day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
    : String(day.getDate())

  return (
    <div
      ref={setNodeRef}
      aria-label={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      className={`flex flex-col gap-1.5 p-2 transition-colors ${
        list ? 'rounded-xl border bg-navy-800' : `border-r border-b border-navy-700 [&:nth-child(7n)]:border-r-0 ${tall ? 'min-h-56' : 'min-h-28'}`
      } ${outside ? 'bg-navy-850 opacity-60' : list ? '' : 'bg-navy-800'} ${isOver ? 'bg-cyan-tint' : ''}`}
    >
      <span
        className={`w-fit rounded-full text-xs font-bold tabular-nums first-letter:uppercase ${
          isToday ? 'bg-violet-600 px-2 py-0.5 text-on-accent' : past ? 'text-slate-400' : 'text-slate-300'
        }`}
      >
        {label}
      </span>
      {posts.map((post) => (
        <PostChip key={post.id} post={post} onOpen={() => onOpen(post.id)} />
      ))}
      {list && posts.length === 0 && <span className="text-xs text-slate-400">Nada marcado</span>}
    </div>
  )
}

function PostChip({ post, onOpen }: { post: InstagramPost; onOpen: () => void }) {
  const movable = isPending(post)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id, disabled: !movable })
  const status = POST_STATUS[post.status]
  const time = new Date(postDate(post)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const cover = post.images[0]

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`flex items-center gap-1.5 rounded-sm border bg-navy-750 p-1 text-left ${
        isDragging ? 'relative z-10 border-cyan shadow-float' : 'border-navy-600'
      }`}
    >
      {movable && (
        <button
          type="button"
          aria-label={`Arrastar post das ${time} para outro dia`}
          className="grid h-7 w-4 shrink-0 cursor-grab touch-none place-items-center text-slate-400"
          {...listeners}
          {...attributes}
        >
          <GripVertical aria-hidden size={14} strokeWidth={1.75} />
        </button>
      )}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left">
        {cover && <img src={cover.url} alt="" className="size-7 shrink-0 rounded-xs object-cover" />}
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1 text-xs font-bold ${status.tone}`}>
            <StatusIcon status={post.status} />
            <span className="tabular-nums">{time}</span>
          </span>
          <span className="block truncate text-xs text-slate-300">{post.caption || 'Sem legenda'}</span>
        </span>
      </button>
    </div>
  )
}
