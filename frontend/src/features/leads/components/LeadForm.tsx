import { Archive, ArchiveRestore, CircleAlert, LoaderCircle, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Dropdown } from '../../../components/ui/Dropdown.tsx'
import { Field, Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { ApiError } from '../../../lib/api.ts'
import { formatCurrency, parseCurrency } from '../../../lib/format.ts'
import { useCreateLead, useDeleteLead, useUpdateLead } from '../hooks.ts'
import { LEAD_SOURCES } from '../sources.ts'
import type { Lead, LeadInput } from '../types.ts'
import { SourceIcon } from './SourceIcon.tsx'

/** Criar (em uma etapa) ou editar um lead existente. */
export type LeadFormTarget = { mode: 'create'; stageId: string } | { mode: 'edit'; lead: Lead }

/** Etapa oferecida no campo "Etapa" (label já pronto, ex.: "Vendas · Proposta") */
export interface StageOption {
  id: string
  label: string
  /** Cor da etapa (bolinha no dropdown) */
  colorClass?: string
}

type Field = 'name' | 'email' | 'instagramUsername' | 'estimatedValue'

/** Formulário de lead: usado no modal "Novo lead" e na aba "Dados" do painel. */
export function LeadForm({
  target,
  stages,
  onDone,
}: {
  target: LeadFormTarget
  stages: StageOption[]
  onDone: () => void
}) {
  const lead = target.mode === 'edit' ? target.lead : null
  const create = useCreateLead()
  const update = useUpdateLead()
  const remove = useDeleteLead()
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
    const instagramUsername = text('instagramUsername').replace(/^@/, '')
    const estimatedValue = parseCurrency(text('estimatedValue'))
    const meetingInput = text('meetingAt')
    const meetingAt = meetingInput ? new Date(meetingInput).toISOString() : ''

    const invalid = validate(name, email, instagramUsername, estimatedValue)
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
      instagramUsername: optional(instagramUsername),
      source: optional(text('source')),
      notes: optional(text('notes')),
      responsibleName: optional(text('responsibleName')),
      estimatedValue: optional(estimatedValue),
      meetingAt: optional(meetingAt),
      ...(lead && { archived: data.get('archived') === 'on' }),
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
        <Field label="Instagram" htmlFor="lead-instagram">
          <Input
            id="lead-instagram"
            name="instagramUsername"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={31}
            defaultValue={lead?.instagramUsername ? `@${lead.instagramUsername}` : ''}
            placeholder="@usuario"
            aria-invalid={fieldError?.field === 'instagramUsername'}
          />
        </Field>
        <Field label="Origem" htmlFor="lead-source">
          <Dropdown
            id="lead-source"
            name="source"
            defaultValue={lead?.source ?? ''}
            options={[
              { value: '', label: 'Sem origem' },
              ...sources.map((source) => ({
                value: source,
                label: source,
                icon: <SourceIcon source={source} size={16} />,
              })),
            ]}
          />
        </Field>
      </div>

      <Field label="Responsável na loja" htmlFor="lead-responsible" hint="Quem decide. A IA usa o nome nas mensagens.">
        <Input
          id="lead-responsible"
          name="responsibleName"
          maxLength={120}
          defaultValue={lead?.responsibleName ?? ''}
          placeholder="Nome de quem decide"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor estimado" htmlFor="lead-value">
          <Input
            id="lead-value"
            name="estimatedValue"
            inputMode="decimal"
            className="tabular-nums"
            defaultValue={lead?.estimatedValue ? formatCurrency(lead.estimatedValue).replace(/R\$\s/, '') : ''}
            placeholder="0,00"
            aria-invalid={fieldError?.field === 'estimatedValue'}
          />
        </Field>

        {!lead && (
          <Field label="Etapa" htmlFor="lead-stage">
            <Dropdown
              id="lead-stage"
              name="stageId"
              defaultValue={target.mode === 'create' ? target.stageId : (stages[0]?.id ?? '')}
              options={stages.map((stage) => ({
                value: stage.id,
                label: stage.label,
                icon: stage.colorClass && (
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
                ),
              }))}
            />
          </Field>
        )}
      </div>

      <Field label="Observações" htmlFor="lead-notes">
        <Textarea
          id="lead-notes"
          name="notes"
          maxLength={5000}
          defaultValue={lead?.notes ?? ''}
          placeholder="Contexto, interesses, próximos passos…"
        />
      </Field>

      {lead && (
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-navy-600 bg-navy-750 px-3.5 py-3 text-ui text-slate-300">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={lead.archived}
            className="size-4 accent-violet-600"
          />
          {lead.archived ? (
            <ArchiveRestore aria-hidden size={18} strokeWidth={1.75} className="text-cyan" />
          ) : (
            <Archive aria-hidden size={18} strokeWidth={1.75} className="text-slate-400" />
          )}
          <span>{lead.archived ? 'Restaurar lead no funil' : 'Arquivar lead e tirar do funil'}</span>
        </label>
      )}

      <Field label="Reunião marcada" htmlFor="lead-meeting-at" hint="Opcional; aparece como próximo passo no card.">
        <Input
          id="lead-meeting-at"
          name="meetingAt"
          type="datetime-local"
          defaultValue={lead?.meetingAt ? toLocalDateTime(lead.meetingAt) : ''}
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

function toLocalDateTime(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function validate(
  name: string,
  email: string,
  instagramUsername: string,
  estimatedValue: number | null,
): { field: Field; message: string } | null {
  if (!name) return { field: 'name', message: 'Informe o nome do lead.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: 'Digite um e-mail válido.' }
  }
  if (instagramUsername && !/^[A-Za-z0-9._]{1,30}$/.test(instagramUsername)) {
    return { field: 'instagramUsername', message: 'O @ do Instagram tem só letras, números, ponto e sublinhado.' }
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
