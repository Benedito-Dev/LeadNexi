import { useEffect, useState } from 'react'
import { BellRing, CircleAlert, Handshake, MessagesSquare, Users, Wallet } from 'lucide-react'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { CartaoDeNumero } from '@/components/ui/cartao-de-numero'
import { cn } from '@/lib/utils'
import { formatarReais } from '../crm/filtros'
import { listarClientes } from './api'
import { FichaDoCliente } from './components/FichaDoCliente'
import { CHECKLIST, corDaCobranca, SITUACOES, textoDaCobranca, textoDoCusto } from './formato'
import type { Cliente } from './tipos'

/** Clientes: quem fechou. Números do mês no topo, um cartão por cliente e a ficha ao clicar. */
export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [erro, setErro] = useState(false)
  const [abertoId, setAbertoId] = useState<string | null>(null)

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch(() => setErro(true))
  }, [])

  const ativos = clientes?.filter((c) => c.status === 'ACTIVE') ?? []
  const mensal = ativos.reduce((soma, c) => soma + Number(c.monthlyFee), 0)
  const cobrar = ativos.filter((c) => c.billing.remind)
  const conversas = ativos.reduce((soma, c) => soma + c.totals.conversations, 0)
  const investido = ativos.reduce((soma, c) => soma + Number(c.totals.spend), 0)
  // Troca o cliente na lista pelo que o servidor devolveu (ficha, relatório ou pagamento)
  const atualizar = (novo: Cliente) => setClientes((lista) => lista?.map((c) => (c.id === novo.id ? novo : c)) ?? null)

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Clientes · LeadNexi</title>
      <ListPageHeader
        icon={Handshake}
        title="Clientes"
        summary={ativos.length > 0 ? `${ativos.length} ${ativos.length === 1 ? 'ativo' : 'ativos'} · ${formatarReais(mensal)} por mês` : 'Quem fechou com você'}
      />

      {erro ? (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-leadnexi-danger/40 bg-card p-5 text-sm font-semibold text-foreground">
          <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
          Não foi possível carregar os clientes. Atualize a página para tentar de novo.
        </p>
      ) : !clientes ? (
        <div aria-busy="true" aria-label="Carregando clientes" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-leadnexi-violet/15 text-leadnexi-violet-texto">
            <Handshake aria-hidden className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <p className="m-0 text-lg font-extrabold text-foreground">O primeiro cliente aparece aqui</p>
          <p className="m-0 max-w-md text-sm font-medium text-muted-foreground">
            Mova o lead para "Fechou" no quadro do CRM: a ficha, a cobrança e os relatórios ficam prontos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoDeNumero Icone={Users} tom="violeta" rotulo="Clientes ativos" valor={String(ativos.length)} detalhe={`${clientes.length} no total, contando pausados e encerrados`} />
            <CartaoDeNumero Icone={Wallet} tom="verde" rotulo="Mensalidades" valor={formatarReais(mensal)} detalhe="Soma dos clientes ativos, por mês" />
            <CartaoDeNumero
              Icone={BellRing}
              tom="ambar"
              rotulo="Cobranças agora"
              valor={String(cobrar.length)}
              detalhe={cobrar.length > 0 ? cobrar.map((c) => c.lead.name).join(', ') : 'Nenhuma vence nos próximos 3 dias'}
            />
            <CartaoDeNumero
              Icone={MessagesSquare}
              tom="ciano"
              rotulo="Custo por conversa"
              valor={textoDoCusto(conversas > 0 ? investido / conversas : null)}
              detalhe={`${conversas} conversas com ${formatarReais(investido)} investidos`}
            />
          </div>

          <ul className="m-0 grid gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {clientes.map((cliente) => (
              <CartaoDoCliente key={cliente.id} cliente={cliente} onAbrir={() => setAbertoId(cliente.id)} />
            ))}
          </ul>
        </>
      )}

      <FichaDoCliente cliente={clientes?.find((c) => c.id === abertoId) ?? null} onFechar={() => setAbertoId(null)} onAtualizado={atualizar} />
    </div>
  )
}

function CartaoDoCliente({ cliente, onAbrir }: { cliente: Cliente; onAbrir: () => void }) {
  const situacao = SITUACOES[cliente.status]
  const feitos = CHECKLIST.filter(({ chave }) => cliente[chave]).length
  const ultimo = cliente.reports[0]
  const ativo = cliente.status === 'ACTIVE'

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onAbrir}
        className={cn(
          'flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-leadnexi-violet/50',
          cliente.status === 'ENDED' && 'opacity-60',
        )}
      >
        <span className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leadnexi-violet/15 text-base font-extrabold text-leadnexi-violet-texto">
            {cliente.lead.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold text-foreground">{cliente.lead.name}</span>
            <span className="mt-1 flex items-center gap-2">
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', situacao.classe)}>{situacao.rotulo}</span>
              <span className="truncate text-xs font-medium text-muted-foreground">{cliente.plan}</span>
            </span>
          </span>
          <span className="text-right">
            <span className="block text-lg font-extrabold tabular-nums text-foreground">{formatarReais(Number(cliente.monthlyFee))}</span>
            <span className="block text-[11px] font-semibold text-muted-foreground">por mês</span>
          </span>
        </span>

        <span className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Info rotulo="Cobrança" valor={ativo ? textoDaCobranca(cliente.billing) : '—'} classe={ativo ? corDaCobranca(cliente.billing) : undefined} />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-muted-foreground">Entrada</span>
            <span className="mt-1 flex items-center gap-1" aria-label={`${feitos} de ${CHECKLIST.length} feitos`}>
              {CHECKLIST.map(({ chave }) => (
                <span key={chave} className={cn('h-1.5 flex-1 rounded-full', cliente[chave] ? 'bg-success-foreground' : 'bg-muted')} />
              ))}
            </span>
            <span className="mt-1 block text-xs font-bold tabular-nums text-foreground">
              {feitos}/{CHECKLIST.length}
            </span>
          </span>
          <Info rotulo="Última semana" valor={ultimo ? `${textoDoCusto(ultimo.costPerConversation)}/conversa` : 'Sem relatório'} />
        </span>
      </button>
    </li>
  )
}

function Info({ rotulo, valor, classe = 'text-foreground' }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold text-muted-foreground">{rotulo}</span>
      <span className={cn('mt-0.5 block truncate text-xs font-bold tabular-nums', classe)}>{valor}</span>
    </span>
  )
}
