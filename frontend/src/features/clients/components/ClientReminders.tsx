import { FileBarChart, Handshake, Wallet } from 'lucide-react'
import { useState } from 'react'
import { billingLabel, billingTone, shortDay } from '../format.ts'
import { useClientReminders, useClients } from '../hooks.ts'
import { ClientDialog } from './ClientDialog.tsx'
import { formatCurrency } from '../../../lib/format.ts'

/**
 * Lembretes dos clientes na tela Hoje (spec F9): renovação vencendo em até 3 dias (ou atrasada) e
 * relatório da semana passada ainda não lançado. Sem nada pendente, não aparece.
 */
export function ClientReminders() {
  const reminders = useClientReminders()
  // A ficha aberta vem da lista (atualizada a cada mudança feita no modal)
  const clients = useClients()
  const [openId, setOpenId] = useState<string | null>(null)
  const renewals = reminders.data?.renewals ?? []
  const reports = reminders.data?.pendingReports ?? []
  if (renewals.length + reports.length === 0) return null

  return (
    <section aria-labelledby="clients-reminders" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Handshake aria-hidden size={17} strokeWidth={1.75} className="text-success" />
        <h3 id="clients-reminders" className="text-ui font-bold text-white">
          Clientes
        </h3>
        <span className="rounded-full bg-navy-700 px-2 py-0.5 text-xs font-bold text-slate-300 tabular-nums">
          {renewals.length + reports.length}
        </span>
        <span className="hidden text-small text-slate-500 sm:inline">Cobrança e relatório da semana</span>
      </div>
      <ul className="grid gap-2 xl:grid-cols-2">
        {renewals.map((client) => (
          <Reminder
            key={`renewal-${client.id}`}
            icon={Wallet}
            title={client.lead.name}
            detail={`Renovação de ${formatCurrency(client.monthlyFee)} · ${billingLabel(client.billing)}`}
            tone={billingTone(client.billing)}
            action="Registrar Pix"
            onOpen={() => setOpenId(client.id)}
          />
        ))}
        {reports.map((client) => (
          <Reminder
            key={`report-${client.id}`}
            icon={FileBarChart}
            title={client.lead.name}
            detail={`Relatório da semana de ${shortDay(client.pendingWeek)} pendente`}
            tone="text-cyan"
            action="Lançar semana"
            onOpen={() => setOpenId(client.id)}
          />
        ))}
      </ul>
      <ClientDialog client={clients.data?.find((client) => client.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </section>
  )
}

function Reminder({
  icon: Icon,
  title,
  detail,
  tone,
  action,
  onOpen,
}: {
  icon: typeof Wallet
  title: string
  detail: string
  tone: string
  action: string
  onOpen: () => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-navy-800 p-4">
      <Icon aria-hidden size={18} strokeWidth={1.75} className={`shrink-0 ${tone}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui font-bold text-white">{title}</span>
        <span className={`block text-small ${tone}`}>{detail}</span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="h-9 shrink-0 cursor-pointer rounded-sm border border-navy-600 px-3 text-small font-bold text-white transition-colors hover:bg-navy-750"
      >
        {action}
      </button>
    </li>
  )
}
