import { BadgeCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Field, Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { useDeleteProof, useProofs, useSaveProof } from '../hooks.ts'
import type { Proof } from '../types.ts'

/**
 * Banco de provas (spec 4.6): os únicos resultados que a IA pode citar, com fonte e data.
 * São conversas iniciadas, não vendas; o nome da loja só aparece com autorização.
 */
export function ProofsCard() {
  const proofs = useProofs()
  const [editing, setEditing] = useState<Proof | 'new' | null>(null)

  return (
    <section aria-labelledby="proofs-title" className="rounded-xl border bg-navy-750 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-violet-tint text-violet-300">
            <BadgeCheck aria-hidden size={19} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-cyan uppercase">IA</p>
            <h2 id="proofs-title" className="mt-1 text-h2">Banco de provas</h2>
            <p className="mt-1 text-small text-slate-400">
              Resultados reais que a IA pode citar. Fora daqui, ela não usa número nenhum.
            </p>
          </div>
        </div>
        {editing === null && (
          <Button variant="secondary" className="h-9 px-3.5" onClick={() => setEditing('new')}>
            <Plus aria-hidden size={16} strokeWidth={1.75} />
            Nova prova
          </Button>
        )}
      </div>

      {editing === 'new' && <ProofForm onDone={() => setEditing(null)} />}

      {proofs.isPending ? (
        <div aria-busy="true" className="mt-5 h-20 animate-pulse rounded-md bg-navy-800" />
      ) : proofs.isError ? (
        <p className="mt-5 text-small text-danger">Não foi possível carregar o banco de provas.</p>
      ) : proofs.data.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-navy-600 px-4 py-6 text-center text-small text-slate-400">
          Sem provas, a IA escreve sem citar resultado nenhum.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {proofs.data.map((proof) =>
            editing !== 'new' && editing?.id === proof.id ? (
              <li key={proof.id}>
                <ProofForm proof={proof} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <ProofRow key={proof.id} proof={proof} onEdit={() => setEditing(proof)} />
            ),
          )}
        </ul>
      )}
    </section>
  )
}

function ProofRow({ proof, onEdit }: { proof: Proof; onEdit: () => void }) {
  const save = useSaveProof()
  const remove = useDeleteProof()
  const [confirming, setConfirming] = useState(false)
  const iconButton =
    'grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-white'

  return (
    <li className={`rounded-md border border-navy-600 bg-navy-800 p-4 ${proof.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {proof.highlight && <p className="text-ui font-extrabold text-white tabular-nums">{proof.highlight}</p>}
          <p className="mt-0.5 text-small text-slate-300">{proof.text}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {proof.source}
            {proof.referenceDate && ` · ${proof.referenceDate}`}
            {' · '}
            {proof.canNameClient ? 'pode citar o nome da loja' : 'sem citar o nome da loja'}
          </p>
        </div>
        <button type="button" aria-label="Editar prova" onClick={onEdit} className={iconButton}>
          <Pencil aria-hidden size={15} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={confirming ? 'Confirmar exclusão da prova' : 'Excluir prova'}
          disabled={remove.isPending}
          onBlur={() => setConfirming(false)}
          onClick={() => (confirming ? remove.mutate(proof.id) : setConfirming(true))}
          className={`${iconButton} ${confirming ? 'text-danger' : ''}`}
        >
          <Trash2 aria-hidden size={15} strokeWidth={1.75} />
        </button>
      </div>
      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-small text-slate-300">
        <input
          type="checkbox"
          checked={proof.active}
          disabled={save.isPending}
          onChange={(event) => save.mutate({ id: proof.id, input: { active: event.target.checked } })}
          className="size-4 accent-violet-600"
        />
        A IA pode usar
      </label>
    </li>
  )
}

function ProofForm({ proof, onDone }: { proof?: Proof; onDone: () => void }) {
  const save = useSaveProof()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    if (!text('text') || !text('source')) return
    save.mutate(
      {
        id: proof?.id,
        input: {
          text: text('text'),
          source: text('source'),
          highlight: text('highlight') || null,
          referenceDate: text('referenceDate') || null,
          canNameClient: data.get('canNameClient') === 'on',
        },
      },
      { onSuccess: onDone },
    )
  }

  const prefix = proof ? `proof-${proof.id}` : 'proof-new'
  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-4 rounded-md border border-violet/40 bg-navy-800 p-4">
      <Field label="Resultado (como a IA vai citar)" htmlFor={`${prefix}-text`}>
        <Textarea
          id={`${prefix}-text`}
          name="text"
          required
          rows={2}
          maxLength={600}
          defaultValue={proof?.text}
          placeholder="Loja de celular em Fortaleza: R$ 2,26 por conversa no WhatsApp…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Número em destaque" htmlFor={`${prefix}-highlight`}>
          <Input id={`${prefix}-highlight`} name="highlight" maxLength={80} defaultValue={proof?.highlight ?? ''} placeholder="R$ 2,26 por conversa" />
        </Field>
        <Field label="Fonte" htmlFor={`${prefix}-source`}>
          <Input id={`${prefix}-source`} name="source" required maxLength={120} defaultValue={proof?.source ?? 'Gerenciador de Anúncios'} />
        </Field>
        <Field label="Data ou período" htmlFor={`${prefix}-date`}>
          <Input id={`${prefix}-date`} name="referenceDate" maxLength={40} defaultValue={proof?.referenceDate ?? ''} placeholder="out/2026" />
        </Field>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-small text-slate-300">
        <input type="checkbox" name="canNameClient" defaultChecked={proof?.canNameClient} className="size-4 accent-violet-600" />
        O cliente autorizou citar o nome da loja
      </label>
      {save.error && <p className="text-small text-danger">Não foi possível salvar a prova.</p>}
      <div className="flex gap-2">
        <Button type="submit" className="h-9 px-3.5" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar prova'}
        </Button>
        <Button variant="secondary" className="h-9 px-3.5" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
