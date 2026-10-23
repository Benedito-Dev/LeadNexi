import { Handshake } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ClientDialog } from '../features/clients/components/ClientDialog.tsx'
import { billingLabel, billingTone, CLIENT_STATUS, costLabel } from '../features/clients/format.ts'
import { useClients } from '../features/clients/hooks.ts'
import type { Client } from '../features/clients/types.ts'
import { LeadAvatar } from '../features/leads/components/LeadAvatar.tsx'
import { formatCurrency } from '../lib/format.ts'

// Clientes ativos (spec F9): quem fechou. Cada card mostra mensalidade, próxima cobrança, checklist
// de entrada e o custo por conversa da última semana; clicar abre a ficha.
export function ClientsPage() {
  const clients = useClients()
  const [openId, setOpenId] = useState<string | null>(null)
  const active = clients.data?.filter((client) => client.status === 'ACTIVE') ?? []
  const monthly = active.reduce((sum, client) => sum + Number(client.monthlyFee), 0)

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Clientes"
        description={
          active.length > 0
            ? `${active.length} ${active.length === 1 ? 'cliente ativo' : 'clientes ativos'} · ${formatCurrency(monthly)} por mês`
            : 'Quem fechou com você. A ficha nasce quando o lead vai para "Fechou".'
        }
      />

      {clients.isPending ? (
        <div aria-busy="true" aria-label="Carregando clientes" className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-xl border bg-navy-800" />
          ))}
        </div>
      ) : clients.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar os clientes.</p>
          <Button variant="secondary" onClick={() => void clients.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : clients.data.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed px-6 py-10">
          <Handshake aria-hidden size={22} strokeWidth={1.75} className="text-slate-400" />
          <p className="text-ui font-bold text-white">O primeiro cliente aparece aqui.</p>
          <p className="text-small text-slate-400">
            Arraste o lead para "Fechou" no funil: a ficha, a cobrança e os relatórios ficam prontos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {clients.data.map((client) => (
            <ClientCard key={client.id} client={client} onOpen={() => setOpenId(client.id)} />
          ))}
        </ul>
      )}

      <ClientDialog client={clients.data?.find((client) => client.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  )
}

function ClientCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const status = CLIENT_STATUS[client.status]
  const checklist = [client.partnerAccess, client.whatsappGreeting, client.firstCampaignLive].filter(Boolean).length
  const last = client.reports[0]

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full cursor-pointer flex-col gap-4 rounded-xl border bg-navy-800 p-4 text-left transition-colors hover:border-navy-600 ${
          client.status === 'ENDED' ? 'opacity-70' : ''
        }`}
      >
        <span className="flex items-start gap-3">
          <LeadAvatar name={client.lead.name} avatarId={client.lead.avatarId} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui font-bold text-white">{client.lead.name}</span>
            <span className="mt-0.5 block text-small text-slate-400">
              <span className={`font-bold ${status.tone}`}>{status.label}</span> · {client.plan}
            </span>
          </span>
          <span className="text-ui font-extrabold text-white tabular-nums">{formatCurrency(client.monthlyFee)}</span>
        </span>
        <span className="grid grid-cols-2 gap-2 text-small sm:grid-cols-3">
          <Info wide label="Cobrança" value={client.status === 'ACTIVE' ? billingLabel(client.billing) : '—'} tone={client.status === 'ACTIVE' ? billingTone(client.billing) : undefined} />
          <Info label="Entrada" value={`${checklist}/3 feitos`} tone={checklist === 3 ? 'text-success' : undefined} />
          <Info label="Última semana" value={last ? `${costLabel(last.costPerConversation)}/conversa` : 'Sem relatório'} />
        </span>
      </button>
    </li>
  )
}

/** `wide`: no celular ocupa a linha inteira (o texto da cobrança é o mais longo) */
function Info({ label, value, tone = 'text-slate-300', wide = false }: { label: string; value: string; tone?: string; wide?: boolean }) {
  return (
    <span className={`min-w-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <span className="block text-xs font-semibold text-slate-400">{label}</span>
      <span className={`block truncate font-bold tabular-nums ${tone}`}>{value}</span>
    </span>
  )
}
