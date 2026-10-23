import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { useProofPosts } from '../hooks.ts'

/** Texto que vai no fim da mensagem com o link do post */
function exampleText(permalink: string) {
  return `Te mando um exemplo do que fizemos: ${permalink}`
}

/**
 * "Anexar exemplo" (spec F8): posts publicados marcados como exemplo viram anexo sugerido no
 * follow-up. Escolher um põe o link no fim da mensagem. Sem exemplo marcado, não aparece.
 */
export function AttachExample({ message, onChange }: { message: string; onChange: (message: string) => void }) {
  const proofs = useProofPosts()
  const [open, setOpen] = useState(false)
  if (!proofs.data?.length) return null

  function attach(permalink: string) {
    const base = message.trimEnd()
    onChange(base.includes(permalink) ? base : `${base}${base ? '\n\n' : ''}${exampleText(permalink)}`)
    setOpen(false)
  }

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-sm border border-navy-600 px-3 text-small font-bold text-slate-300 hover:bg-navy-750 [&::-webkit-details-marker]:hidden">
        <BadgeCheck aria-hidden size={16} strokeWidth={1.75} className="text-violet-300" />
        Anexar exemplo
      </summary>
      <ul className="absolute top-10 left-0 z-10 flex w-[min(320px,calc(100vw-48px))] flex-col gap-1 rounded-md border border-navy-600 bg-navy-800 p-1 shadow-float">
        {proofs.data.map((proof) => (
          <li key={proof.id}>
            <button
              type="button"
              onClick={() => attach(proof.permalink)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm p-2 text-left hover:bg-navy-750"
            >
              {proof.coverUrl && <img src={proof.coverUrl} alt="" className="size-10 shrink-0 rounded-xs object-cover" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-bold text-white">{proof.proofNote || 'Post publicado'}</span>
                <span className="block truncate text-xs text-slate-400">{proof.caption || proof.permalink}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
