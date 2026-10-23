import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { Input } from '../../../components/ui/Input.tsx'
import { useUpdatePost } from '../hooks.ts'
import { actionErrorMessage } from '../status.ts'
import type { InstagramPost } from '../types.ts'

/**
 * "Usar como exemplo no follow-up" (spec F8): um post publicado (ex.: carrossel de case) vira
 * anexo sugerido nas mensagens ("Te mando um exemplo do que fizemos"). `compact`: só o botão
 * (lista de posts); completo, com a descrição do exemplo (detalhes do post).
 */
export function ProofToggle({ post, compact = false }: { post: InstagramPost; compact?: boolean }) {
  const update = useUpdatePost()
  const [note, setNote] = useState(post.proofNote ?? '')
  const error = actionErrorMessage(update.error, 'Não foi possível salvar. Tente de novo.')

  const toggle = (
    <button
      type="button"
      aria-pressed={post.isProof}
      disabled={update.isPending}
      onClick={() => update.mutate({ id: post.id, input: { isProof: !post.isProof } })}
      title={post.isProof ? 'Deixar de usar como exemplo' : 'Usar como exemplo no follow-up'}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small transition-colors hover:bg-navy-750 disabled:cursor-wait ${
        post.isProof ? 'font-bold text-violet-300' : 'text-slate-400 hover:text-slate-300'
      }`}
    >
      <BadgeCheck aria-hidden size={16} strokeWidth={1.75} />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{post.isProof ? 'Exemplo' : 'Usar como exemplo'}</span>
    </button>
  )
  if (compact) return toggle

  return (
    <section aria-labelledby="proof-title" className="flex flex-col gap-2 rounded-md border bg-navy-750 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="proof-title" className="text-ui font-bold text-white">
          Exemplo no follow-up
        </h3>
        {toggle}
      </div>
      <p className="text-small text-slate-400">
        Aparece em "Anexar exemplo" nas mensagens para os leads, com o link do post.
      </p>
      {post.isProof && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            update.mutate({ id: post.id, input: { proofNote: note.trim() || null } })
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              value={note}
              maxLength={120}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Do que é o exemplo? Ex.: case da loja de celular"
              aria-label="Do que é o exemplo"
            />
          </div>
          <button
            type="submit"
            disabled={update.isPending || note.trim() === (post.proofNote ?? '')}
            className="h-11 shrink-0 cursor-pointer rounded-md px-3 text-small font-bold text-cyan hover:bg-cyan-tint disabled:cursor-default disabled:opacity-60"
          >
            Salvar
          </button>
        </form>
      )}
      {error && <p className="text-small text-danger">{error}</p>}
    </section>
  )
}
