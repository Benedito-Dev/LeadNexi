import { Check, Copy, Info, UserRound } from 'lucide-react'
import { useState } from 'react'
import { WhatsAppIcon } from '../../../brand/icons.tsx'
import { whatsappUrl } from '../../../lib/format.ts'
import { useUpdateLead } from '../../leads/hooks.ts'
import type { Lead } from '../../leads/types.ts'
import { useSuggestionFeedback, useSuggestReply } from '../hooks.ts'
import type { AiChannel, ReplyIntent } from '../types.ts'
import { AiButton, AiError, CharCount, GuardrailWarnings, SuggestionFeedback } from './AiParts.tsx'

const INTENT_LABEL: Record<ReplyIntent, string> = {
  interested: 'Interessado',
  price: 'Pediu preço',
  objection: 'Objeção',
  forwarded: 'Encaminhou para outra pessoa',
  auto_reply: 'Resposta automática',
  not_interested: 'Sem interesse',
  other: 'Outro',
}

/**
 * "Sugerir resposta" (spec 4.2): a IA classifica a última mensagem do lead e sugere a resposta,
 * seguindo o método de objeções. `message` é o texto colado (sem ele, vale o último do histórico).
 * No WhatsApp, "Abrir no WhatsApp" leva o texto pronto; com `onUse`, o texto vai para a caixa de
 * quem usa (ex.: a conversa do direct).
 */
export function ReplySuggestions({
  lead,
  channel = 'whatsapp',
  message,
  onUse,
  label = 'Sugerir resposta',
}: {
  lead: Pick<Lead, 'id' | 'name'> & Partial<Pick<Lead, 'phone' | 'responsibleName'>>
  channel?: AiChannel
  message?: string
  onUse?: (text: string) => void
  label?: string
}) {
  const reply = useSuggestReply(lead.id)
  const feedback = useSuggestionFeedback()
  const saveLead = useUpdateLead()
  const [copied, setCopied] = useState<number | null>(null)
  const result = reply.data

  function chose(index: number) {
    if (result) feedback.mutate({ id: result.suggestionId, chosenIndex: index })
  }

  function copy(index: number, text: string) {
    void navigator.clipboard?.writeText(text).then(() => setCopied(index))
    chose(index)
  }

  const newResponsible =
    result?.responsibleName && result.responsibleName !== lead.responsibleName ? result.responsibleName : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiButton onClick={() => reply.mutate({ channel, message: message?.trim() || undefined })} pending={reply.isPending}>
          {result ? 'Sugerir de novo' : label}
        </AiButton>
        {result && <SuggestionFeedback key={result.suggestionId} suggestionId={result.suggestionId} />}
      </div>
      <AiError error={reply.error} />

      {result && (
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-small text-slate-300">
            <span className="rounded-full bg-violet-tint px-2.5 py-0.5 text-xs font-bold text-violet-300">
              {INTENT_LABEL[result.intent]}
            </span>
            {result.objection && <span>{result.objection}</span>}
          </p>
          {result.warning && (
            <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-small text-warning">
              <Info aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
              {result.warning}
            </p>
          )}
          {newResponsible && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-navy-600 bg-navy-750 px-3 py-2 text-small text-slate-300">
              <UserRound aria-hidden size={16} strokeWidth={1.75} className="text-cyan" />
              <span>
                Responsável: <strong className="text-white">{newResponsible}</strong>
              </span>
              <button
                type="button"
                disabled={saveLead.isPending || saveLead.isSuccess}
                onClick={() => saveLead.mutate({ id: lead.id, input: { name: lead.name, responsibleName: newResponsible } })}
                className="ml-auto h-8 cursor-pointer rounded-sm px-2.5 text-small font-bold text-cyan hover:bg-cyan-tint disabled:cursor-default disabled:opacity-60"
              >
                {saveLead.isSuccess ? 'Salvo' : 'Salvar no lead'}
              </button>
            </div>
          )}

          <ul aria-label="Respostas sugeridas" className="flex flex-col gap-2">
            {result.options.map((option, index) => {
              const link = channel === 'whatsapp' && lead.phone ? whatsappUrl(lead.phone, option.text) : null
              return (
                <li key={`${result.suggestionId}-${index}`} className="rounded-md border border-navy-600 bg-navy-750 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-violet-300">
                      {index === 0 ? 'Sugerida' : 'Alternativa'} · {option.label}
                    </span>
                    <CharCount text={option.text} />
                  </div>
                  <p className="mt-1.5 text-small leading-5 break-words whitespace-pre-wrap text-slate-300">{option.text}</p>
                  <GuardrailWarnings warnings={option.warnings} />
                  <div className="mt-2 flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => copy(index, option.text)}
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-small font-bold text-slate-300 transition-colors hover:bg-navy-800 hover:text-white"
                    >
                      {copied === index ? <Check aria-hidden size={15} strokeWidth={1.75} /> : <Copy aria-hidden size={15} strokeWidth={1.75} />}
                      {copied === index ? 'Copiado' : 'Copiar'}
                    </button>
                    {onUse && (
                      <button
                        type="button"
                        onClick={() => {
                          onUse(option.text)
                          chose(index)
                        }}
                        className="inline-flex h-8 cursor-pointer items-center rounded-sm px-2.5 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint"
                      >
                        Usar esta
                      </button>
                    )}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => chose(index)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint"
                      >
                        <WhatsAppIcon aria-hidden size={15} />
                        Abrir no WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
