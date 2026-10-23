import { CircleAlert, LoaderCircle, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ApiError } from '../../../lib/api.ts'
import { useAiStatus, useSuggestionFeedback } from '../hooks.ts'
import type { GuardrailWarning } from '../types.ts'

// Peças comuns dos recursos de IA (spec F4). A IA só sugere: todo texto passa pelo usuário.

/**
 * Botão secundário com o ícone de IA. Sem a IA configurada no servidor, fica desligado e o
 * título explica o motivo.
 */
export function AiButton({
  onClick,
  pending,
  children,
  className = '',
}: {
  onClick: () => void
  pending: boolean
  children: ReactNode
  className?: string
}) {
  const status = useAiStatus()
  const unavailable = status.data?.configured === false
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      disabled={pending || unavailable}
      title={unavailable ? 'A IA não está configurada no servidor (ANTHROPIC_API_KEY)' : undefined}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-violet/40 px-3 text-small font-bold text-violet-300 transition-colors hover:bg-violet-tint disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? (
        <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
      ) : (
        <Sparkles aria-hidden size={16} strokeWidth={1.75} />
      )}
      {pending ? 'Pensando…' : children}
    </button>
  )
}

/** Avisos das regras de ouro (número sem fonte, promessa de resultado). */
export function GuardrailWarnings({ warnings }: { warnings: GuardrailWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="flex flex-col gap-1">
      {warnings.map((warning) => (
        <li key={warning.detail} className="flex items-start gap-1.5 text-xs font-semibold text-warning">
          <TriangleAlert aria-hidden size={14} strokeWidth={1.75} className="mt-px shrink-0" />
          {warning.detail}
        </li>
      ))}
    </ul>
  )
}

/** Gostei / não gostei de uma sugestão (um voto por resposta da IA). */
export function SuggestionFeedback({ suggestionId }: { suggestionId: string }) {
  const [vote, setVote] = useState<1 | -1 | null>(null)
  const feedback = useSuggestionFeedback()

  function choose(value: 1 | -1) {
    const next = vote === value ? null : value
    setVote(next)
    feedback.mutate({ id: suggestionId, feedback: next ?? 0 })
  }

  const button =
    'grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-white aria-pressed:text-cyan'
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs font-semibold text-slate-400">Ajudou?</span>
      <button type="button" aria-pressed={vote === 1} aria-label="Gostei da sugestão" onClick={() => choose(1)} className={button}>
        <ThumbsUp aria-hidden size={15} strokeWidth={1.75} />
      </button>
      <button type="button" aria-pressed={vote === -1} aria-label="Não gostei da sugestão" onClick={() => choose(-1)} className={button}>
        <ThumbsDown aria-hidden size={15} strokeWidth={1.75} />
      </button>
    </div>
  )
}

export function AiError({ error }: { error: Error | null }) {
  if (!error) return null
  const message =
    error instanceof ApiError && error.status !== 0 && error.status !== 500
      ? error.message
      : 'Não foi possível falar com a IA. Tente de novo.'
  return (
    <p role="alert" className="flex items-start gap-2 text-small text-danger">
      <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      {message}
    </p>
  )
}

/** "312 caracteres" */
export function CharCount({ text }: { text: string }) {
  return <span className="text-xs font-semibold text-slate-400 tabular-nums">{text.length} caracteres</span>
}
