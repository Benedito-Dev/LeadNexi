import { BadgeCheck, Check, CircleAlert, Copy, LoaderCircle, Trash2, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { WhatsAppIcon } from '../../../brand/icons.tsx'
import { Button } from '../../../components/ui/Button.tsx'
import { Dropdown } from '../../../components/ui/Dropdown.tsx'
import { Field, Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { Modal } from '../../../components/ui/Modal.tsx'
import { ApiError } from '../../../lib/api.ts'
import { formatCurrency, parseCurrency, whatsappUrl } from '../../../lib/format.ts'
import { useSaveProof } from '../../ai/hooks.ts'
import { LeadAvatar } from '../../leads/components/LeadAvatar.tsx'
import {
  billingLabel,
  billingTone,
  CLIENT_STATUS,
  costLabel,
  lastWeekStart,
  monthLabel,
  shortDay,
} from '../format.ts'
import {
  useAddClientPayment,
  useDeleteClientPayment,
  useDeleteClientReport,
  useSaveClientReport,
  useUpdateClient,
} from '../hooks.ts'
import type { Client, ClientStatus } from '../types.ts'

type Tab = 'ficha' | 'relatorios' | 'cobranca'

const TABS: { value: Tab; label: string }[] = [
  { value: 'ficha', label: 'Ficha' },
  { value: 'relatorios', label: 'Relatórios' },
  { value: 'cobranca', label: 'Cobrança' },
]

// Ficha do cliente (spec F9), no modal grande da marca: "Ficha" (plano, mensalidade, cobrança, verba e
// checklist de entrada), "Relatórios" (semana a semana, com a mensagem pronta e "Adicionar ao banco
// de provas") e "Cobrança" (próximo vencimento e Pix recebidos).
export function ClientDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  return (
    <Modal open={client !== null} onClose={onClose} label={client ? `Cliente ${client.lead.name}` : 'Cliente'}>
      {client && <Content client={client} onClose={onClose} />}
    </Modal>
  )
}

function Content({ client, onClose }: { client: Client; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('ficha')
  const status = CLIENT_STATUS[client.status]

  return (
    <>
      <header className="flex items-start gap-3 border-b px-6 pt-5 pb-4">
        <LeadAvatar name={client.lead.name} avatarId={client.lead.avatarId} />
        <div className="min-w-0 flex-1">
          <h2 className="text-h2 break-words">{client.lead.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-slate-400">
            <span className={`font-bold ${status.tone}`}>{status.label}</span>
            <span aria-hidden>·</span>
            <span className="font-bold text-white tabular-nums">{formatCurrency(client.monthlyFee)}/mês</span>
            <span aria-hidden>·</span>
            <span className={billingTone(client.billing)}>{billingLabel(client.billing)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>

      <div role="tablist" aria-label="Seções do cliente" className="flex gap-1 border-b px-6">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-3 text-ui transition-colors ${
              tab === value ? 'border-violet font-bold text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {tab === 'ficha' && <ProfileTab key={client.id} client={client} />}
        {tab === 'relatorios' && <ReportsTab client={client} />}
        {/* Pago o mês, o formulário recomeça no próximo mês a pagar */}
        {tab === 'cobranca' && <BillingTab key={client.billing.period} client={client} />}
      </div>
    </>
  )
}

// ── Ficha ──────────────────────────────────────────────────────────────────────

const CHECKLIST = [
  { key: 'partnerAccess', label: 'Acesso de parceiro no Business Manager', hint: 'Pedir acesso de parceiro, nunca a senha.' },
  { key: 'whatsappGreeting', label: 'WhatsApp Business com saudação automática', hint: 'Quem chega pelo anúncio é respondido na hora.' },
  { key: 'firstCampaignLive', label: 'Primeira campanha no ar', hint: 'Campanha de mensagens, só perto da loja.' },
] as const

function ProfileTab({ client }: { client: Client }) {
  const update = useUpdateClient(client.id)
  const [status, setStatus] = useState<ClientStatus>(client.status)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const done = CHECKLIST.filter(({ key }) => client[key]).length

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    const monthlyFee = parseCurrency(text('monthlyFee'))
    const budget = parseCurrency(text('dailyAdBudget'))
    const billingDay = Number(text('billingDay'))
    if (monthlyFee === null || Number.isNaN(monthlyFee)) return setFieldError('Digite a mensalidade, como 500,00.')
    if (Number.isNaN(budget)) return setFieldError('Digite a verba diária, como 20,00.')
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) return setFieldError('O dia de cobrança vai de 1 a 28.')
    setFieldError(null)
    update.mutate({
      status,
      plan: text('plan') || client.plan,
      monthlyFee,
      billingDay,
      dailyAdBudget: budget,
      startDate: text('startDate') ? new Date(`${text('startDate')}T12:00:00`).toISOString() : undefined,
      notes: text('notes') || null,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="checklist-title" className="flex flex-col gap-3">
        <h3 id="checklist-title" className="flex items-center justify-between text-ui font-bold text-white">
          Checklist de entrada
          <span className="text-small font-semibold text-slate-400 tabular-nums">
            {done}/{CHECKLIST.length}
          </span>
        </h3>
        <ul className="flex flex-col gap-2">
          {CHECKLIST.map(({ key, label, hint }) => (
            <li key={key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-navy-600 bg-navy-750 px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={client[key]}
                  disabled={update.isPending}
                  onChange={(event) => update.mutate({ [key]: event.target.checked })}
                  className="mt-0.5 size-4 accent-violet-600"
                />
                <span>
                  <span className={`block text-ui ${client[key] ? 'text-slate-400 line-through' : 'text-white'}`}>{label}</span>
                  <span className="block text-small text-slate-400">{hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Situação" htmlFor="client-status">
            <Dropdown
              id="client-status"
              value={status}
              onChange={(value) => setStatus(value as ClientStatus)}
              options={(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((value) => ({ value, label: CLIENT_STATUS[value].label }))}
            />
          </Field>
          <Field label="Plano" htmlFor="client-plan">
            <Input id="client-plan" name="plan" maxLength={120} defaultValue={client.plan} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Mensalidade (R$)" htmlFor="client-fee">
            <Input id="client-fee" name="monthlyFee" inputMode="decimal" className="tabular-nums" defaultValue={formatCurrency(client.monthlyFee).replace(/R\$\s/, '')} />
          </Field>
          <Field label="Dia de cobrança" htmlFor="client-billing-day">
            <Input id="client-billing-day" name="billingDay" type="number" min={1} max={28} className="tabular-nums" defaultValue={client.billingDay} />
          </Field>
          <Field label="Verba diária (R$)" htmlFor="client-budget" hint="Paga pelo cliente direto à Meta.">
            <Input
              id="client-budget"
              name="dailyAdBudget"
              inputMode="decimal"
              className="tabular-nums"
              placeholder="0,00"
              defaultValue={client.dailyAdBudget ? formatCurrency(client.dailyAdBudget).replace(/R\$\s/, '') : ''}
            />
          </Field>
        </div>
        <Field label="Início do contrato" htmlFor="client-start">
          <Input id="client-start" name="startDate" type="date" defaultValue={client.startDate.slice(0, 10)} />
        </Field>
        <Field label="Observações" htmlFor="client-notes">
          <Textarea id="client-notes" name="notes" maxLength={5000} defaultValue={client.notes ?? ''} placeholder="Produtos em foco, horário de atendimento, combinados…" />
        </Field>
        <ErrorText>{fieldError ?? requestError(update.error)}</ErrorText>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />}
            Salvar ficha
          </Button>
          {update.isSuccess && (
            <span className="flex items-center gap-1 text-small font-bold text-success">
              <Check aria-hidden size={16} strokeWidth={1.75} />
              Salvo
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

// ── Relatórios ─────────────────────────────────────────────────────────────────

function ReportsTab({ client }: { client: Client }) {
  const save = useSaveClientReport(client.id)
  const remove = useDeleteClientReport(client.id)
  const [week, setWeek] = useState(() => lastWeekStart())
  const [formError, setFormError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const spend = parseCurrency(String(data.get('spend') ?? ''))
    const conversations = Number(data.get('conversations'))
    if (spend === null || Number.isNaN(spend)) return setFormError('Digite quanto foi gasto, como 140,00.')
    if (!Number.isInteger(conversations) || conversations < 0) return setFormError('Digite o número de conversas.')
    setFormError(null)
    save.mutate(
      { weekStart: week, spend, conversations, notes: String(data.get('notes') ?? '').trim() || undefined },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Investido no total" value={formatCurrency(client.totals.spend)} />
        <Stat label="Conversas no WhatsApp" value={String(client.totals.conversations)} />
        <Stat label="Custo médio por conversa" value={costLabel(client.totals.costPerConversation)} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-md border bg-navy-750 p-4">
        <h3 className="text-ui font-bold text-white">Lançar semana</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Semana de" htmlFor="report-week" hint="Vale a segunda-feira da semana.">
            <Input id="report-week" type="date" value={week} onChange={(event) => setWeek(event.target.value)} required />
          </Field>
          <Field label="Gasto (R$)" htmlFor="report-spend">
            <Input id="report-spend" name="spend" inputMode="decimal" className="tabular-nums" placeholder="0,00" required />
          </Field>
          <Field label="Conversas" htmlFor="report-conversations">
            <Input id="report-conversations" name="conversations" type="number" min={0} className="tabular-nums" placeholder="0" required />
          </Field>
        </div>
        <Field label="Observação (opcional)" htmlFor="report-notes">
          <Input id="report-notes" name="notes" maxLength={1000} placeholder="Ex.: troquei o criativo na quarta" />
        </Field>
        <ErrorText>{formError ?? requestError(save.error)}</ErrorText>
        <div>
          <Button type="submit" className="h-9 px-3.5" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar semana'}
          </Button>
        </div>
      </form>

      {client.reports.length === 0 ? (
        <p className="rounded-md border border-dashed border-navy-600 px-4 py-6 text-center text-small text-slate-400">
          Nenhuma semana lançada ainda. Os números vêm do Gerenciador de Anúncios.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {client.reports.map((report) => (
            <li key={report.id} className="rounded-md border border-navy-600 bg-navy-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ui font-bold text-white">Semana de {shortDay(report.weekStart)}</p>
                <button
                  type="button"
                  aria-label={`Apagar a semana de ${shortDay(report.weekStart)}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(report.id)}
                  className="grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 hover:bg-navy-750 hover:text-danger"
                >
                  <Trash2 aria-hidden size={15} strokeWidth={1.75} />
                </button>
              </div>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-small text-slate-300 tabular-nums">
                <span>{formatCurrency(report.spend)} investidos</span>
                <span>{report.conversations} conversas</span>
                <span className="font-bold text-white">{costLabel(report.costPerConversation)} por conversa</span>
              </p>
              {report.notes && <p className="mt-1 text-small text-slate-400">{report.notes}</p>}
              <ReportMessage message={report.message} phone={client.lead.phone} />
            </li>
          ))}
        </ul>
      )}

      {client.totals.conversations > 0 && <AddToProofs client={client} />}
    </div>
  )
}

function ReportMessage({ message, phone }: { message: string; phone: string | null }) {
  const [copied, setCopied] = useState(false)
  const link = phone ? whatsappUrl(phone, message) : null
  return (
    <details className="mt-3 rounded-sm border border-navy-700">
      <summary className="cursor-pointer px-3 py-2 text-small font-bold text-cyan">Mensagem para o cliente</summary>
      <p className="border-t border-navy-700 px-3 py-2 text-small leading-5 whitespace-pre-wrap text-slate-300">{message}</p>
      <div className="flex flex-wrap justify-end gap-1 border-t border-navy-700 p-2">
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(message).then(() => setCopied(true))}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-small font-bold text-slate-300 hover:bg-navy-750 hover:text-white"
        >
          {copied ? <Check aria-hidden size={15} strokeWidth={1.75} /> : <Copy aria-hidden size={15} strokeWidth={1.75} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-small font-bold text-cyan hover:bg-cyan-tint"
          >
            <WhatsAppIcon aria-hidden size={15} />
            Abrir no WhatsApp
          </a>
        )}
      </div>
    </details>
  )
}

/** Mês curto para a data da prova: "out/2026" */
function proofMonth(day: string) {
  const [year, month] = day.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${label}/${year}`
}

/** "Adicionar ao banco de provas" (spec F9): o resultado do cliente vira prova que a IA pode citar. */
function AddToProofs({ client }: { client: Client }) {
  const save = useSaveProof()
  const [open, setOpen] = useState(false)
  const [canName, setCanName] = useState(false)
  const cost = costLabel(client.totals.costPerConversation)
  const weeks = client.reports.map((report) => report.weekStart).sort()
  const period = weeks.length > 1 && proofMonth(weeks[0]) !== proofMonth(weeks.at(-1)!)
    ? `${proofMonth(weeks[0])}–${proofMonth(weeks.at(-1)!)}`
    : proofMonth(weeks[0])
  const subject = canName ? client.lead.name : 'Cliente em Fortaleza'
  const suggested = `${subject}: ${cost} por conversa no WhatsApp (${client.totals.conversations} conversas, ${formatCurrency(client.totals.spend)} investidos).`
  const [text, setText] = useState<string | null>(null)

  if (save.isSuccess) {
    return (
      <p className="flex items-center gap-2 text-small font-bold text-success">
        <Check aria-hidden size={16} strokeWidth={1.75} />
        Resultado salvo no banco de provas (tela Resultados).
      </p>
    )
  }
  if (!open) {
    return (
      <div>
        <Button variant="secondary" className="h-9 px-3.5" onClick={() => setOpen(true)}>
          <BadgeCheck aria-hidden size={16} strokeWidth={1.75} className="text-violet-300" />
          Adicionar ao banco de provas
        </Button>
      </div>
    )
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({
          input: {
            text: (text ?? suggested).trim(),
            highlight: `${cost} por conversa`,
            source: 'Gerenciador de Anúncios',
            referenceDate: period,
            canNameClient: canName,
          },
        })
      }}
      className="flex flex-col gap-3 rounded-md border border-violet/40 bg-navy-750 p-4"
    >
      <h3 className="text-ui font-bold text-white">Caso de sucesso</h3>
      <p className="text-small text-slate-400">
        A IA passa a poder citar este resultado. São conversas iniciadas, não vendas.
      </p>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-small text-slate-300">
        <input type="checkbox" checked={canName} onChange={(event) => setCanName(event.target.checked)} className="size-4 accent-violet-600" />
        O cliente autorizou citar o nome da loja
      </label>
      <Textarea value={text ?? suggested} onChange={(event) => setText(event.target.value)} rows={3} maxLength={600} aria-label="Texto da prova" />
      <ErrorText>{save.error ? 'Não foi possível salvar a prova.' : null}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" className="h-9 px-3.5" disabled={save.isPending}>
          Salvar prova
        </Button>
        <Button variant="secondary" className="h-9 px-3.5" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// ── Cobrança ───────────────────────────────────────────────────────────────────

function BillingTab({ client }: { client: Client }) {
  const add = useAddClientPayment(client.id)
  const remove = useDeleteClientPayment(client.id)
  const [period, setPeriod] = useState(client.billing.period)
  const [formError, setFormError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const amount = parseCurrency(String(data.get('amount') ?? ''))
    if (amount === null || Number.isNaN(amount) || amount <= 0) return setFormError('Digite o valor recebido, como 500,00.')
    setFormError(null)
    add.mutate({ amount, period, note: String(data.get('note') ?? '').trim() || undefined })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={`rounded-md border p-4 ${client.billing.overdue ? 'border-danger/50' : client.billing.remind ? 'border-warning/50' : ''} bg-navy-750`}>
        <p className="text-small text-slate-400">Próxima cobrança</p>
        <p className="mt-1 text-h2 tabular-nums">{formatCurrency(client.monthlyFee)}</p>
        <p className={`mt-1 text-small font-bold ${billingTone(client.billing)}`}>
          {monthLabel(client.billing.period)} · {billingLabel(client.billing)}
        </p>
      </section>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-md border bg-navy-750 p-4">
        <h3 className="text-ui font-bold text-white">Registrar Pix recebido</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor (R$)" htmlFor="payment-amount">
            <Input
              id="payment-amount"
              name="amount"
              inputMode="decimal"
              className="tabular-nums"
              defaultValue={formatCurrency(client.monthlyFee).replace(/R\$\s/, '')}
            />
          </Field>
          <Field label="Mês que paga" htmlFor="payment-period">
            <Input id="payment-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required />
          </Field>
        </div>
        <Field label="Observação (opcional)" htmlFor="payment-note">
          <Input id="payment-note" name="note" maxLength={280} placeholder="Ex.: Pix do sócio" />
        </Field>
        <ErrorText>{formError ?? requestError(add.error)}</ErrorText>
        <div>
          <Button type="submit" className="h-9 px-3.5" disabled={add.isPending}>
            {add.isPending ? 'Registrando…' : 'Registrar pagamento'}
          </Button>
        </div>
      </form>

      {client.payments.length > 0 && (
        <section aria-labelledby="payments-title" className="flex flex-col gap-2">
          <h3 id="payments-title" className="text-small text-slate-400">
            Pagamentos recebidos
          </h3>
          <ul className="flex flex-col gap-2">
            {client.payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 rounded-md border border-navy-600 bg-navy-800 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-ui font-bold text-success tabular-nums">{formatCurrency(payment.amount)}</span>
                  <span className="block text-small text-slate-400 first-letter:uppercase">
                    {monthLabel(payment.period)} · pago em {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                    {payment.note && ` · ${payment.note}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Apagar pagamento"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(payment.id)}
                  className="grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 hover:bg-navy-750 hover:text-danger"
                >
                  <Trash2 aria-hidden size={15} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── Peças comuns ───────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-navy-750 p-4">
      <p className="text-small text-slate-400">{label}</p>
      <p className="mt-1 text-ui font-extrabold text-white tabular-nums">{value}</p>
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="flex items-start gap-2 text-small text-danger">
      <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      {children}
    </p>
  )
}

function requestError(error: Error | null): string | null {
  if (!error) return null
  return error instanceof ApiError && error.status < 500 ? error.message : 'Não foi possível salvar. Tente de novo.'
}
