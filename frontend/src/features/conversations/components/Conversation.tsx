import { CircleAlert, ExternalLink, Info, RotateCw, Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../../components/ui/Button.tsx'
import { ApiError } from '../../../lib/api.ts'
import { formatDay } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'
import { useConversation, useNow, useSendMessage } from '../hooks.ts'
import type { ConversationMessage, ReplyBlock } from '../types.ts'
import { MAX_MESSAGE_BYTES } from '../window.ts'

/** Faltando menos que isso, o aviso da janela fica amarelo */
const CLOSING_SOON_MS = 60 * 60 * 1000

type ConversationLead = Pick<Lead, 'id' | 'name' | 'instagramUsername'>

/** Mensagem que ainda não voltou do servidor: enviando, ou falhou (com "Tentar de novo") */
interface PendingMessage {
  key: string
  text: string
  error: string | null
}

// Conversa do direct com o lead (BRAND.md, seção 8 · "Conversa do direct"): balões recebidos à
// esquerda (navy) e enviados à direita (violeta), aviso de até quando dá para responder e a caixa de
// texto. Fora da janela de 24 h (ou sem direct), a caixa dá lugar ao motivo e a "Abrir no Instagram".
// Usada no modal (card do Kanban) e na aba "Conversa" do painel do lead.
export function Conversation({ lead }: { lead: ConversationLead }) {
  const conversation = useConversation(lead.id)
  const send = useSendMessage(lead.id)
  const now = useNow()
  const [pending, setPending] = useState<PendingMessage[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  const messages = conversation.data?.messages ?? []
  // Rola até o fim ao abrir e quando chega (ou sai) mensagem; a conferência a cada 10 s não mexe
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages.length, pending.length])

  function deliver(text: string, key: string = crypto.randomUUID()) {
    setPending((list) => [...list.filter((item) => item.key !== key), { key, text, error: null }])
    send.mutateAsync(text).then(
      () => setPending((list) => list.filter((item) => item.key !== key)),
      (error: unknown) =>
        setPending((list) => list.map((item) => (item.key === key ? { ...item, error: sendErrorMessage(error) } : item))),
    )
  }

  if (conversation.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando conversa" className="flex flex-1 flex-col gap-3 px-5 py-5">
        {['w-2/3', 'ml-auto w-1/2', 'w-1/3'].map((width) => (
          <div key={width} className={`h-10 animate-pulse rounded-lg bg-navy-750 ${width}`} />
        ))}
      </div>
    )
  }
  if (conversation.isError) {
    return (
      <div className="flex flex-1 flex-col items-start gap-4 px-5 py-5">
        <p className="text-body text-slate-400">Não foi possível carregar a conversa.</p>
        <Button variant="secondary" onClick={() => void conversation.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const { replyUntil } = conversation.data
  const remaining = replyUntil ? new Date(replyUntil).getTime() - now : 0
  // A janela pode fechar com a conversa aberta (o servidor confere de novo ao enviar)
  const blocked: ReplyBlock | null = conversation.data.blocked ?? (remaining <= 0 ? 'window-closed' : null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!blocked && <WindowStatus remaining={remaining} />}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && pending.length === 0 ? (
          <p className="py-10 text-center text-small text-slate-400">Nenhuma mensagem ainda.</p>
        ) : (
          <MessageList
            messages={messages}
            pending={pending}
            onRetry={(item) => deliver(item.text, item.key)}
            onDiscard={(item) => setPending((list) => list.filter((other) => other.key !== item.key))}
          />
        )}
      </div>

      {blocked ? <BlockedNotice lead={lead} reason={blocked} /> : <Composer onSend={(text) => deliver(text)} />}
    </div>
  )
}

/** "Pode responder por mais 5 h": verde; faltando menos de 1 h, amarelo. */
function WindowStatus({ remaining }: { remaining: number }) {
  const hours = Math.floor(remaining / 3_600_000)
  const left = hours >= 1 ? `${hours} h` : `${Math.max(1, Math.ceil(remaining / 60_000))} min`
  const soon = remaining < CLOSING_SOON_MS
  return (
    <p className="flex items-center gap-2 border-b px-5 py-2.5 text-small text-slate-300">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${soon ? 'bg-warning' : 'bg-success'}`} />
      Pode responder por mais {left}
    </p>
  )
}

function MessageList({
  messages,
  pending,
  onRetry,
  onDiscard,
}: {
  messages: ConversationMessage[]
  pending: PendingMessage[]
  onRetry: (item: PendingMessage) => void
  onDiscard: (item: PendingMessage) => void
}) {
  return (
    <ol className="flex flex-col gap-2">
      {messages.map((message, index) => {
        const day = formatDay(new Date(message.createdAt))
        const previous = messages[index - 1]
        const newDay = !previous || formatDay(new Date(previous.createdAt)) !== day
        return (
          <li key={message.id} className="flex flex-col">
            {newDay && <p className="py-2 text-center text-xs font-semibold text-slate-400">{day}</p>}
            <Bubble sent={message.direction === 'sent'} text={message.text}>
              <time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString('pt-BR')}>
                {formatTime(message.createdAt)}
              </time>
            </Bubble>
          </li>
        )
      })}
      {pending.map((item) => (
        <li key={item.key} className="flex flex-col">
          <Bubble sent text={item.text} faded={item.error === null} failed={item.error !== null}>
            {item.error === null ? (
              'Enviando…'
            ) : (
              <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                <span className="flex items-start gap-1 text-danger">
                  <CircleAlert aria-hidden size={14} strokeWidth={1.75} className="mt-px shrink-0" />
                  {item.error}
                </span>
                <button
                  type="button"
                  onClick={() => onRetry(item)}
                  className="inline-flex cursor-pointer items-center gap-1 text-slate-300 hover:text-white"
                >
                  <RotateCw aria-hidden size={13} strokeWidth={1.75} />
                  Tentar de novo
                </button>
                <button
                  type="button"
                  onClick={() => onDiscard(item)}
                  className="inline-flex cursor-pointer items-center gap-1 text-slate-400 hover:text-slate-300"
                >
                  <X aria-hidden size={13} strokeWidth={1.75} />
                  Descartar
                </button>
              </span>
            )}
          </Bubble>
        </li>
      ))}
    </ol>
  )
}

/** Balão: recebido à esquerda (navy), enviado à direita (violeta); a linha de baixo (hora ou estado) fora dele. */
function Bubble({
  sent,
  text,
  faded = false,
  failed = false,
  children,
}: {
  sent: boolean
  text: string
  faded?: boolean
  failed?: boolean
  children: ReactNode
}) {
  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${sent ? 'items-end self-end' : 'items-start self-start'}`}>
      <p
        className={`rounded-lg px-3.5 py-2 text-ui break-words whitespace-pre-wrap ${
          sent ? 'rounded-br-xs bg-violet-600 text-on-accent' : 'rounded-bl-xs bg-navy-750 text-white'
        } ${faded ? 'opacity-60' : ''} ${failed ? 'ring-1 ring-danger' : ''}`}
      >
        {text}
      </p>
      <p className="px-1 text-xs font-semibold text-slate-400">{children}</p>
    </div>
  )
}

/** Caixa de texto: Enter envia, Shift+Enter quebra a linha; contador de bytes (limite da Meta). */
function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const bytes = new TextEncoder().encode(text.trim()).length
  const tooLong = bytes > MAX_MESSAGE_BYTES
  const canSend = text.trim() !== '' && !tooLong

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    onSend(text.trim())
    setText('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t px-5 py-3">
      <div className="flex items-end gap-2">
        <label htmlFor="conversation-text" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="conversation-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Escreva uma mensagem..."
          aria-invalid={tooLong}
          className="field-sizing-content max-h-40 min-h-11 w-full resize-none rounded-md border bg-navy-800 px-3.5 py-2.5 text-body text-white placeholder:text-slate-400 aria-[invalid=true]:border-danger"
        />
        <Button type="submit" disabled={!canSend} aria-label="Enviar" title="Enviar" className="shrink-0 px-3.5">
          <Send aria-hidden size={18} strokeWidth={1.75} />
        </Button>
      </div>
      <p className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
        <span className="[@media(hover:none)]:invisible">Enter envia · Shift+Enter quebra a linha</span>
        <span className={`tabular-nums ${tooLong ? 'text-danger' : ''}`}>
          {bytes}/{MAX_MESSAGE_BYTES}
        </span>
      </p>
    </form>
  )
}

/** No lugar da caixa de texto: por que não dá para responder e a saída ("Abrir no Instagram"). */
function BlockedNotice({ lead, reason }: { lead: ConversationLead; reason: ReplyBlock }) {
  const firstName = lead.name.split(' ')[0]
  const message = {
    'no-direct': 'Esse lead ainda não mandou direct. O Instagram só deixa responder por aqui quem escreveu primeiro.',
    'window-closed': `Passaram 24 h desde a última mensagem de ${firstName}. Quando ${firstName} escrever de novo, você responde por aqui; pelo app do Instagram dá para responder agora.`,
    reconnect: 'A conexão com o Instagram expirou. Conecte de novo para responder por aqui.',
  }[reason]

  return (
    <div className="flex flex-col items-start gap-3 border-t px-5 py-4">
      <p className="flex items-start gap-2 text-small text-slate-300">
        <Info aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0 text-slate-400" />
        {message}
      </p>
      {reason === 'reconnect' ? (
        <Link
          to="/instagram"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-navy-600 px-5 text-ui font-bold text-white transition-colors hover:bg-navy-750"
        >
          Conectar de novo
        </Link>
      ) : (
        <a
          href={
            lead.instagramUsername
              ? `https://ig.me/m/${encodeURIComponent(lead.instagramUsername)}`
              : 'https://www.instagram.com/direct/inbox/'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-navy-600 px-5 text-ui font-bold text-cyan transition-colors hover:bg-navy-750"
        >
          <ExternalLink aria-hidden size={18} strokeWidth={1.75} />
          Abrir no Instagram
        </a>
      )}
    </div>
  )
}

/** Recusas que o servidor explica em português (mensagem, janela, conexão, Meta) */
const EXPLAINED = new Set([400, 404, 409, 502])

/** Motivo do servidor ou uma mensagem genérica. */
function sendErrorMessage(error: unknown) {
  return error instanceof ApiError && EXPLAINED.has(error.status)
    ? error.message
    : 'Não foi possível enviar. Tente de novo.'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

