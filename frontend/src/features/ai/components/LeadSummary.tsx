import { CalendarClock, Sparkles } from 'lucide-react'
import { formatAgo, formatDateTime } from '../../../lib/format.ts'
import { useScheduleFollowUp } from '../../leads/hooks.ts'
import type { Lead } from '../../leads/types.ts'
import { useSummarizeLead } from '../hooks.ts'
import { AiButton, AiError, SuggestionFeedback } from './AiParts.tsx'

/** Data do próximo passo: daqui a `days` dias, às 9h (0 = hoje, daqui a 1 hora) */
function nextStepDate(days: number): Date {
  const date = new Date()
  if (days <= 0) {
    date.setHours(date.getHours() + 1, 0, 0, 0)
    return date
  }
  date.setDate(date.getDate() + days)
  date.setHours(9, 0, 0, 0)
  return date
}

/**
 * "Resumir conversa" (spec 4.3) + "Próximo passo sugerido" (4.4): 3 linhas no topo do lead
 * (situação, o que o lead quer, próximo passo) e um botão para agendar o passo sugerido.
 */
export function LeadSummary({ lead }: { lead: Pick<Lead, 'id' | 'aiSummary' | 'aiSummaryAt'> }) {
  const summarize = useSummarizeLead(lead.id)
  const schedule = useScheduleFollowUp(lead.id)
  const summary = lead.aiSummary

  if (!summary) {
    return (
      <section aria-label="Resumo da IA" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <AiButton onClick={() => summarize.mutate()} pending={summarize.isPending}>
            Resumir conversa
          </AiButton>
          <span className="text-small text-slate-400">Situação, o que o lead quer e o próximo passo.</span>
        </div>
        <AiError error={summarize.error} />
      </section>
    )
  }

  const dueAt = summary.nextStepDays !== null ? nextStepDate(summary.nextStepDays) : null
  const rows = [
    { label: 'Situação', text: summary.situation },
    { label: 'O que quer', text: summary.wants },
    { label: 'Próximo passo', text: summary.nextStep },
  ]

  return (
    <section aria-labelledby="ai-summary-title" className="rounded-md border border-violet/40 bg-navy-750 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ai-summary-title" className="flex items-center gap-2 text-ui font-bold text-white">
          <Sparkles aria-hidden size={16} strokeWidth={1.75} className="text-violet-300" />
          Resumo da IA
          {lead.aiSummaryAt && (
            <time dateTime={lead.aiSummaryAt} className="text-xs font-semibold text-slate-400">
              {formatAgo(lead.aiSummaryAt)}
            </time>
          )}
        </h3>
        {summary.suggestionId && <SuggestionFeedback key={summary.suggestionId} suggestionId={summary.suggestionId} />}
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-0.5 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
            <dt className="text-small font-semibold text-slate-400">{row.label}</dt>
            <dd className="text-small text-slate-300">{row.text}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {dueAt && (
          <button
            type="button"
            disabled={schedule.isPending || schedule.isSuccess}
            onClick={() => schedule.mutate({ dueAt: dueAt.toISOString(), note: summary.nextStep.slice(0, 280) })}
            title={formatDateTime(dueAt.toISOString())}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-navy-600 px-3 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint disabled:cursor-default disabled:opacity-60"
          >
            <CalendarClock aria-hidden size={16} strokeWidth={1.75} />
            {schedule.isSuccess ? 'Agendado' : `Agendar para ${formatDateTime(dueAt.toISOString())}`}
          </button>
        )}
        <AiButton onClick={() => summarize.mutate()} pending={summarize.isPending}>
          Atualizar resumo
        </AiButton>
      </div>
      <AiError error={summarize.error ?? schedule.error} />
    </section>
  )
}
