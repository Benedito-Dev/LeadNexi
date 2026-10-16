import { CircleAlert, LoaderCircle, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../../components/ui/Button.tsx'
import { Field } from '../../../../components/ui/Field.tsx'
import { Input } from '../../../../components/ui/Input.tsx'
import { Modal } from '../../../../components/ui/Modal.tsx'
import { useCreateLeadList } from '../../hooks.ts'
import type { LeadList } from '../../types.ts'

export function LeadListCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (list: LeadList) => void
}) {
  const create = useCreateLeadList()
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const niche = String(data.get('niche') ?? '').trim()
    const city = String(data.get('city') ?? '').trim()
    if (!name) {
      setError('Informe um nome para a lista.')
      return
    }
    setError(null)
    create.mutate(
      { name, niche: niche || undefined, city: city || undefined },
      {
        onSuccess: (list) => onCreated({ ...list, leadCount: list.leadCount ?? 0 }),
        onError: () => setError('Não foi possível criar a lista. Tente de novo.'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} label="Criar lista ou nicho">
      <div className="flex h-full flex-col">
        <header className="flex items-start gap-3 border-b px-6 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-h2">Nova lista</h2>
            <p className="mt-1 text-small text-slate-400">Organize os leads por nicho, cidade ou campanha.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
          >
            <X aria-hidden size={20} strokeWidth={1.75} />
          </button>
        </header>

        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <Field label="Nome da lista" htmlFor="lead-list-name" hint="Ex.: Lojas de celular · Fortaleza · out/2026">
            <Input id="lead-list-name" name="name" autoFocus maxLength={120} placeholder="Nome da lista" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nicho" htmlFor="lead-list-niche">
              <Input id="lead-list-niche" name="niche" maxLength={120} placeholder="Lojas de celular" />
            </Field>
            <Field label="Cidade" htmlFor="lead-list-city">
              <Input id="lead-list-city" name="city" maxLength={120} placeholder="Fortaleza" />
            </Field>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-small text-danger">
              <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-auto flex flex-wrap justify-end gap-3 border-t pt-5">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />}
              Criar lista
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
