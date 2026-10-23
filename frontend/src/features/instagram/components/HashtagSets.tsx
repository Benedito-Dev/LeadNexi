import { Hash, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Input } from '../../../components/ui/Input.tsx'
import { useCreateHashtagSet, useDeleteHashtagSet, useHashtagSets } from '../hooks.ts'

/** Hashtags da legenda, na ordem, sem repetir */
function hashtagsOf(caption: string) {
  return [...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) ?? [])]
}

/**
 * Grupos de hashtags salvos (spec F8): um clique põe o grupo no fim da legenda (sem repetir as que
 * já estão lá). "Salvar as da legenda" guarda as hashtags escritas como um grupo novo.
 */
export function HashtagSets({ caption, onChange }: { caption: string; onChange: (caption: string) => void }) {
  const sets = useHashtagSets()
  const create = useCreateHashtagSet()
  const remove = useDeleteHashtagSet()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const inCaption = hashtagsOf(caption)
  const present = new Set(inCaption.map((tag) => tag.toLowerCase()))

  function insert(tags: string) {
    const missing = tags.split(' ').filter((tag) => !present.has(tag.toLowerCase()))
    if (missing.length === 0) return
    const base = caption.trimEnd()
    onChange(`${base}${base ? '\n\n' : ''}${missing.join(' ')}`)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate(
      { name: name.trim(), tags: inCaption.join(' ') },
      {
        onSuccess: () => {
          setName('')
          setNaming(false)
        },
      },
    )
  }

  const chip =
    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-navy-600 px-2.5 text-small text-slate-300 transition-colors hover:bg-navy-750 hover:text-white'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
          <Hash aria-hidden size={14} strokeWidth={1.75} />
          Hashtags salvas
        </span>
        {sets.data?.map((set) => (
          <span key={set.id} className="inline-flex items-center">
            <button type="button" title={set.tags} onClick={() => insert(set.tags)} className={`${chip} rounded-r-none`}>
              <Plus aria-hidden size={14} strokeWidth={1.75} />
              {set.name}
            </button>
            <button
              type="button"
              aria-label={`Apagar o grupo ${set.name}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(set.id)}
              className={`${chip} -ml-px rounded-l-none px-1.5 text-slate-400 hover:text-danger`}
            >
              <X aria-hidden size={14} strokeWidth={1.75} />
            </button>
          </span>
        ))}
        {sets.data?.length === 0 && <span className="text-xs text-slate-400">Nenhum grupo ainda.</span>}
        {inCaption.length > 0 && !naming && (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="h-8 cursor-pointer rounded-sm px-2.5 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint"
          >
            Salvar as da legenda
          </button>
        )}
      </div>
      {naming && (
        <form onSubmit={save} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              autoFocus
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Nome do grupo (${inCaption.length} hashtags)`}
              aria-label="Nome do grupo de hashtags"
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || create.isPending}
            className="h-11 shrink-0 cursor-pointer rounded-md px-3 text-small font-bold text-cyan hover:bg-cyan-tint disabled:cursor-default disabled:opacity-60"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setNaming(false)}
            className="h-11 shrink-0 cursor-pointer rounded-md px-3 text-small text-slate-400 hover:bg-navy-750"
          >
            Cancelar
          </button>
        </form>
      )}
      {create.error && <p className="text-small text-danger">Não foi possível salvar o grupo.</p>}
    </div>
  )
}
