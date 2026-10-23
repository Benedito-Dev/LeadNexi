import { Check } from 'lucide-react'
import { useState } from 'react'
import type { MessageOrigin } from '../../leads/api.ts'
import type { Lead } from '../../leads/types.ts'
import { useGenerateMessage, useSuggestionFeedback } from '../hooks.ts'
import type { AiChannel } from '../types.ts'
import { AiButton, AiError, CharCount, GuardrailWarnings, SuggestionFeedback } from './AiParts.tsx'

/**
 * "Gerar mensagem" (spec 4.1): a IA escreve 1 mensagem + 2 variações para o próximo passo do lead.
 * Escolher uma joga o texto no campo de quem usa (`onPick`); o envio continua manual.
 */
export function MessageSuggestions({
  lead,
  channel = 'whatsapp',
  onPick,
}: {
  lead: Pick<Lead, 'id' | 'name'>
  channel?: AiChannel
  onPick: (text: string, origin: MessageOrigin) => void
}) {
  const generate = useGenerateMessage(lead.id)
  const feedback = useSuggestionFeedback()
  const [chosen, setChosen] = useState<number | null>(null)
  const result = generate.data

  function run() {
    setChosen(null)
    generate.mutate({ channel })
  }

  function pick(index: number) {
    if (!result) return
    const option = result.options[index]
    setChosen(index)
    onPick(option.text, { templateId: `ia-${option.template}`, variation: option.label })
    feedback.mutate({ id: result.suggestionId, chosenIndex: index })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiButton onClick={run} pending={generate.isPending}>
          {result ? 'Gerar de novo' : 'Gerar com IA'}
        </AiButton>
        {result && <SuggestionFeedback key={result.suggestionId} suggestionId={result.suggestionId} />}
      </div>
      <AiError error={generate.error} />
      {result && (
        <ul aria-label={`Sugestões de mensagem para ${lead.name}`} className="flex flex-col gap-2">
          {result.options.map((option, index) => {
            const selected = chosen === index
            return (
              <li
                key={`${result.suggestionId}-${index}`}
                className={`rounded-md border p-3 transition-colors ${selected ? 'border-violet bg-violet-tint' : 'border-navy-600 bg-navy-750'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-violet-300">
                    {index === 0 ? 'Sugerida' : `Variação ${index}`} · {option.label}
                  </span>
                  <CharCount text={option.text} />
                </div>
                <p className="mt-1.5 text-small leading-5 break-words whitespace-pre-wrap text-slate-300">{option.text}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <GuardrailWarnings warnings={option.warnings} />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      pick(index)
                    }}
                    className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint"
                  >
                    {selected && <Check aria-hidden size={15} strokeWidth={1.75} />}
                    {selected ? 'Em uso' : 'Usar esta'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
