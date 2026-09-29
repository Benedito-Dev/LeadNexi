import { CircleAlert, LoaderCircle, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Dialog } from '../../../components/ui/Dialog.tsx'
import { Field, Select, Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { ApiError } from '../../../lib/api.ts'
import { formatCurrency, parseCurrency } from '../../../lib/format.ts'
import type { Stage } from '../../pipelines/types.ts'
import { useCreateLead, useDeleteLead, useUpdateLead } from '../hooks.ts'
import { LEAD_SOURCES } from '../sources.ts'
import type { Lead, LeadInput } from '../types.ts'

/** Criar (em uma etapa) ou editar um lead existente. */
export type LeadFormTarget = { mode: 'create'; stageId: string } | { mode: 'edit'; lead: Lead }

export function LeadFormDialog({
  target,
  pipelineId,
  stages,
  onClose,
}: {
  target: LeadFormTarget | null
  pipelineId: string
  stages: Stage[]
  onClose: () => void
}) {
  const title = target?.mode === 'edit' ? 'Editar lead' : 'Novo lead'
  return (
    <Dialog open={target !== null} onClose={onClose} title={title}>
      {target && (
        <LeadForm target={target} pipelineId={pipelineId} stages={stages} onDone={onClose} />
      )}
    </Dialog>
  )
}

type Field = 'name' | 'email' | 'estimatedValue'

function LeadForm({
  target,
  pipelineId,
  stages,
  onDone,
}: {
  target: LeadFormTarget
  pipelineId: string
  stages: Stage[]
  onDone: () => void
}) {
  const lead = target.mode === 'edit' ? target.lead : null
  const create = useCreateLead(pipelineId)
  const update = useUpdateLead(pipelineId)
  const remove = useDeleteLead(pipelineId)
  const [fieldError, setFieldError] = useState<{ field: Field; message: string } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const saving = create.isPending || update.isPending
  const requestError = create.error ?? update.error ?? remove.error
  const error = fieldError?.message ?? (requestError ? requestErrorMessage(requestError) : null)

  // Origem gravada fora da lista (texto livre vindo da API) continua selecionável
  const sources: string[] = [...LEAD_SOURCES]
  if (lead?.source && !sources.includes(lead.source)) sources.push(lead.source)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? '').trim()

    const name = text('name')
    const email = text('email')
    const estimatedValue = parseCurrency(text('estimatedValue'))

    const invalid = validate(name, email, estimatedValue)
    setFieldError(invalid)
    if (invalid) {
      ;(form.elements.namedItem(invalid.field) as HTMLInputElement).focus()
      return
    }

    // Campo vazio: na criação é omitido; na edição vira null para limpar no servidor
    const empty = lead ? null : undefined
    const optional = <T,>(value: T | null) => (value === '' || value === null ? empty : value)
    const input: LeadInput = {
      name,
      phone: optional(text('phone')),
      email: optional(email),
      source: optional(text('source')),
      notes: optional(text('notes')),
      estimatedValue: optional(estimatedValue),
    }

    if (lead) update.mutate({ id: lead.id, input }, { onSuccess: onDone })
    else create.mutate({ ...input, stageId: text('stageId') }, { onSuccess: onDone })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nome" htmlFor="lead-name">
        <Input
          id="lead-name"
          name="name"
          autoFocus
          maxLength={120}
          defaultValue={lead?.name}
          placeholder="Nome do lead ou do negócio"
          aria-invalid={fieldError?.field === 'name'}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone / WhatsApp" htmlFor="lead-phone">
          <Input
            id="lead-phone"
            name="phone"
            type="tel"
            maxLength={30}
            defaultValue={lead?.phone ?? ''}
            placeholder="+55 85 99999-0000"
          />
        </Field>
        <Field label="E-mail" htmlFor="lead-email">
          <Input
            id="lead-email"
            name="email"
            type="email"
            maxLength={160}
            defaultValue={lead?.email ?? ''}
            placeholder="contato@email.com"
            aria-invalid={fieldError?.field === 'email'}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Origem" htmlFor="lead-source">
          <Select id="lead-source" name="source" defaultValue={lead?.source ?? ''}>
            <option value="">Sem origem</option>
            {sources.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </Select>
        </Field>
        <Field label="Valor estimado" htmlFor="lead-value">
          <Input
            id="lead-value"
            name="estimatedValue"
            inputMode="decimal"
            className="font-mono"
            defaultValue={
              lead?.estimatedValue ? formatCurrency(lead.estimatedValue).replace(/R\$\s/, '') : ''
            }
            placeholder="0,00"
            aria-invalid={fieldError?.field === 'estimatedValue'}
          />
        </Field>
      </div>

      {!lead && (
        <Field label="Etapa" htmlFor="lead-stage">
          <Select id="lead-stage" name="stageId" defaultValue={target.mode === 'create' ? target.stageId : undefined}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Observações" htmlFor="lead-notes">
        <Textarea
          id="lead-notes"
          name="notes"
          maxLength={5000}
          defaultValue={lead?.notes ?? ''}
          placeholder="Contexto, interesses, próximos passos…"
        />
      </Field>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-small text-danger">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {lead ? (
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() =>
              confirmingDelete ? remove.mutate(lead.id, { onSuccess: onDone }) : setConfirmingDelete(true)
            }
          >
            <Trash2 aria-hidden size={18} strokeWidth={1.75} />
            {confirmingDelete ? 'Confirmar exclusão' : 'Excluir'}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />}
            {lead ? 'Salvar' : 'Criar lead'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function validate(
  name: string,
  email: string,
  estimatedValue: number | null,
): { field: Field; message: string } | null {
  if (!name) return { field: 'name', message: 'Informe o nome do lead.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: 'Digite um e-mail válido.' }
  }
  if (Number.isNaN(estimatedValue)) {
    return { field: 'estimatedValue', message: 'Digite um valor válido, como 1.500,00.' }
  }
  return null
}

function requestErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status < 500) return error.message
  return 'Não foi possível salvar. Tente de novo em instantes.'
}
