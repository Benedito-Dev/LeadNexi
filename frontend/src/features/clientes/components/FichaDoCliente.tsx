import { useState, type FormEvent } from 'react'
import { Check, ClipboardList, Copy, LoaderCircle, Receipt, Trash2, TrendingUp } from 'lucide-react'
import { WhatsAppLogo } from '@/brand/icons'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { Seletor } from '@/components/ui/seletor'
import { Textarea } from '@/components/ui/textarea'
import { ErroDeApi } from '@/lib/api'
import { lerReais, reaisParaCampo } from '@/lib/reais'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatarReais } from '../../crm/filtros'
import { linkDoWhatsApp } from '../../hoje/textos'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import { alterarCliente, apagarPagamento, apagarRelatorio, registrarPagamento, salvarRelatorio } from '../api'
import { CHECKLIST, corDaCobranca, diaCurto, nomeDoMes, segundaDaSemanaPassada, SITUACOES, textoDaCobranca, textoDoCusto } from '../formato'
import type { Cliente, SituacaoDoCliente } from '../tipos'

type Aba = 'ficha' | 'relatorios' | 'cobranca'

const ABAS: { valor: Aba; rotulo: string; Icone: typeof ClipboardList }[] = [
  { valor: 'ficha', rotulo: 'Ficha', Icone: ClipboardList },
  { valor: 'relatorios', rotulo: 'Relatórios', Icone: TrendingUp },
  { valor: 'cobranca', rotulo: 'Cobrança', Icone: Receipt },
]

type Props = { cliente: Cliente | null; onFechar: () => void; onAtualizado: (cliente: Cliente) => void }

/** Mensagem de erro do servidor (4xx explica o motivo) ou a genérica. */
const motivo = (e: unknown, padrao: string) => (e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : padrao)

/** Ficha do cliente: dados e checklist, relatórios semanais e cobrança, em abas. */
export function FichaDoCliente({ cliente, onFechar, onAtualizado }: Props) {
  return (
    <Dialog open={cliente !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 font-marca sm:max-w-3xl">
        {cliente && <Conteudo key={cliente.id} cliente={cliente} onAtualizado={onAtualizado} />}
      </DialogContent>
    </Dialog>
  )
}

function Conteudo({ cliente, onAtualizado }: { cliente: Cliente; onAtualizado: (cliente: Cliente) => void }) {
  const [aba, setAba] = useState<Aba>('ficha')
  const situacao = SITUACOES[cliente.status]

  return (
    <>
      <header className="flex items-start gap-4 border-b border-border px-6 pb-4 pt-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leadnexi-violet/15 text-lg font-extrabold text-leadnexi-violet-texto">
          {cliente.lead.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 pr-8">
          <DialogTitle className="m-0 break-words text-xl font-extrabold tracking-[-0.02em] text-foreground">{cliente.lead.name}</DialogTitle>
          <DialogDescription asChild>
            <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-muted-foreground">
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', situacao.classe)}>{situacao.rotulo}</span>
              <span className="font-bold tabular-nums text-foreground">{formatarReais(Number(cliente.monthlyFee))}/mês</span>
              {cliente.status === 'ACTIVE' && (
                <>
                  <span aria-hidden>·</span>
                  <span className={cn('font-semibold', corDaCobranca(cliente.billing))}>{textoDaCobranca(cliente.billing)}</span>
                </>
              )}
            </p>
          </DialogDescription>
        </div>
      </header>

      <div className="border-b border-border px-6 py-3">
        <div className={cn(barraDeSegmentos, 'inline-flex gap-1 p-1')} role="tablist" aria-label="Seções do cliente">
          {ABAS.map(({ valor, rotulo, Icone }) => (
            <button key={valor} type="button" role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)} className={cn(segmento(aba === valor), 'gap-1.5')}>
              <Icone aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {aba === 'ficha' && <AbaFicha cliente={cliente} onAtualizado={onAtualizado} />}
        {aba === 'relatorios' && <AbaRelatorios cliente={cliente} onAtualizado={onAtualizado} />}
        {/* Pago o mês, o formulário recomeça no próximo mês a pagar */}
        {aba === 'cobranca' && <AbaCobranca key={cliente.billing.period} cliente={cliente} onAtualizado={onAtualizado} />}
      </div>
    </>
  )
}

type AbaProps = { cliente: Cliente; onAtualizado: (cliente: Cliente) => void }

const caixa = 'rounded-xl border border-border bg-background/40 p-4'

function AbaFicha({ cliente, onAtualizado }: AbaProps) {
  const [situacao, setSituacao] = useState<SituacaoDoCliente>(cliente.status)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const feitos = CHECKLIST.filter(({ chave }) => cliente[chave]).length

  const marcar = async (chave: (typeof CHECKLIST)[number]['chave'], valor: boolean) => {
    try {
      onAtualizado(await alterarCliente(cliente.id, { [chave]: valor }))
    } catch (e) {
      addToast('error', 'Não foi possível salvar', motivo(e, 'Tente de novo.'))
    }
  }

  const salvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const texto = (nome: string) => String(dados.get(nome) ?? '').trim()
    const mensalidade = lerReais(texto('monthlyFee'))
    const verba = lerReais(texto('dailyAdBudget'))
    const diaDeCobranca = Number(texto('billingDay'))
    if (mensalidade === null || Number.isNaN(mensalidade)) return setErro('Digite a mensalidade, como 500,00.')
    if (Number.isNaN(verba)) return setErro('Digite a verba diária, como 20,00.')
    if (!Number.isInteger(diaDeCobranca) || diaDeCobranca < 1 || diaDeCobranca > 28) return setErro('O dia de cobrança vai de 1 a 28.')
    setErro(null)
    setSalvando(true)
    try {
      onAtualizado(
        await alterarCliente(cliente.id, {
          status: situacao,
          plan: texto('plan') || cliente.plan,
          monthlyFee: mensalidade,
          billingDay: diaDeCobranca,
          dailyAdBudget: verba,
          startDate: texto('startDate') ? new Date(`${texto('startDate')}T12:00:00`).toISOString() : undefined,
          notes: texto('notes') || null,
        }),
      )
      addToast('success', 'Ficha salva')
    } catch (e) {
      setErro(motivo(e, 'Não foi possível salvar. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="checklist" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 id="checklist" className="m-0 text-sm font-bold text-foreground">
            Checklist de entrada
          </h3>
          <span className="text-xs font-bold tabular-nums text-muted-foreground">
            {feitos}/{CHECKLIST.length}
          </span>
        </div>
        <ul className="m-0 flex flex-col gap-2 p-0">
          {CHECKLIST.map(({ chave, rotulo, dica }) => (
            <li key={chave} className="list-none">
              <label className={cn(caixa, 'flex cursor-pointer items-start gap-3 py-3 transition-colors hover:border-leadnexi-violet/40')}>
                <input type="checkbox" checked={cliente[chave]} onChange={(e) => void marcar(chave, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--leadnexi-violet-600))]" />
                <span>
                  <span className={cn('block text-sm font-semibold', cliente[chave] ? 'text-muted-foreground line-through' : 'text-foreground')}>{rotulo}</span>
                  <span className="block text-xs font-medium text-muted-foreground">{dica}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <form noValidate onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="client-status" rotulo="Situação">
            <Seletor
              id="client-status"
              valor={situacao}
              onChange={(v) => setSituacao(v as SituacaoDoCliente)}
              opcoes={(Object.keys(SITUACOES) as SituacaoDoCliente[]).map((v) => ({ value: v, label: SITUACOES[v].rotulo }))}
            />
          </Campo>
          <Campo id="client-plan" rotulo="Plano">
            <Input id="client-plan" name="plan" maxLength={120} defaultValue={cliente.plan} />
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="client-fee" rotulo="Mensalidade (R$)">
            <Input id="client-fee" name="monthlyFee" inputMode="decimal" className="tabular-nums" defaultValue={reaisParaCampo(cliente.monthlyFee)} />
          </Campo>
          <Campo id="client-billing-day" rotulo="Dia de cobrança">
            <Input id="client-billing-day" name="billingDay" type="number" min={1} max={28} className="tabular-nums" defaultValue={cliente.billingDay} />
          </Campo>
          <Campo id="client-budget" rotulo="Verba diária (R$)" dica="Paga pelo cliente direto à Meta.">
            <Input id="client-budget" name="dailyAdBudget" inputMode="decimal" className="tabular-nums" placeholder="0,00" defaultValue={cliente.dailyAdBudget ? reaisParaCampo(cliente.dailyAdBudget) : ''} />
          </Campo>
        </div>
        <Campo id="client-start" rotulo="Início do contrato">
          <Input id="client-start" name="startDate" type="date" defaultValue={cliente.startDate.slice(0, 10)} className="sm:w-56" />
        </Campo>
        <Campo id="client-notes" rotulo="Observações">
          <Textarea id="client-notes" name="notes" maxLength={5000} defaultValue={cliente.notes ?? ''} placeholder="Produtos em foco, horário de atendimento, combinados…" />
        </Campo>
        {erro && <MensagemDeErro texto={erro} />}
        <div className="flex justify-end">
          <Button type="submit" className={botaoPrincipalDoTopo} disabled={salvando}>
            {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            Salvar ficha
          </Button>
        </div>
      </form>
    </div>
  )
}

function AbaRelatorios({ cliente, onAtualizado }: AbaProps) {
  const [semana, setSemana] = useState(() => segundaDaSemanaPassada())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const form = evento.currentTarget
    const dados = new FormData(form)
    const gasto = lerReais(String(dados.get('spend') ?? ''))
    const conversas = Number(dados.get('conversations'))
    if (gasto === null || Number.isNaN(gasto)) return setErro('Digite quanto foi gasto, como 140,00.')
    if (!Number.isInteger(conversas) || conversas < 0) return setErro('Digite o número de conversas.')
    setErro(null)
    setSalvando(true)
    try {
      onAtualizado(await salvarRelatorio(cliente.id, { weekStart: semana, spend: gasto, conversations: conversas, notes: String(dados.get('notes') ?? '').trim() || undefined }))
      form.reset()
      addToast('success', 'Semana lançada')
    } catch (e) {
      setErro(motivo(e, 'Não foi possível salvar. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  const apagar = async (relatorioId: string) => {
    try {
      onAtualizado(await apagarRelatorio(cliente.id, relatorioId))
    } catch (e) {
      addToast('error', 'Não foi possível apagar', motivo(e, 'Tente de novo.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Investido no total" valor={formatarReais(Number(cliente.totals.spend))} />
        <Numero rotulo="Conversas no WhatsApp" valor={String(cliente.totals.conversations)} />
        <Numero rotulo="Custo médio por conversa" valor={textoDoCusto(cliente.totals.costPerConversation)} />
      </div>

      <form noValidate onSubmit={(e) => void salvar(e)} className={cn(caixa, 'flex flex-col gap-4')}>
        <h3 className="m-0 text-sm font-bold text-foreground">Lançar semana</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="report-week" rotulo="Semana de" dica="Vale a segunda-feira da semana.">
            <Input id="report-week" type="date" value={semana} onChange={(e) => setSemana(e.target.value)} />
          </Campo>
          <Campo id="report-spend" rotulo="Gasto (R$)">
            <Input id="report-spend" name="spend" inputMode="decimal" className="tabular-nums" placeholder="0,00" />
          </Campo>
          <Campo id="report-conversations" rotulo="Conversas">
            <Input id="report-conversations" name="conversations" type="number" min={0} className="tabular-nums" placeholder="0" />
          </Campo>
        </div>
        <Campo id="report-notes" rotulo="Observação (opcional)">
          <Input id="report-notes" name="notes" maxLength={1000} placeholder="Ex.: troquei o criativo na quarta" />
        </Campo>
        {erro && <MensagemDeErro texto={erro} />}
        <div className="flex justify-end">
          <Button type="submit" className={botaoPrincipalDoTopo} disabled={salvando}>
            {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            Salvar semana
          </Button>
        </div>
      </form>

      {cliente.reports.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm font-medium text-muted-foreground">
          Nenhuma semana lançada ainda. Os números vêm do Gerenciador de Anúncios.
        </p>
      ) : (
        <ul className="m-0 flex flex-col gap-3 p-0">
          {cliente.reports.map((relatorio) => (
            <li key={relatorio.id} className={cn(caixa, 'list-none')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-bold text-foreground">Semana de {diaCurto(relatorio.weekStart)}</p>
                  <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium tabular-nums text-muted-foreground">
                    <span>{formatarReais(Number(relatorio.spend))} investidos</span>
                    <span>{relatorio.conversations} conversas</span>
                    <span className="font-bold text-foreground">{textoDoCusto(relatorio.costPerConversation)} por conversa</span>
                  </p>
                  {relatorio.notes && <p className="m-0 mt-1 text-[13px] text-muted-foreground">{relatorio.notes}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Apagar a semana de ${diaCurto(relatorio.weekStart)}`}
                  onClick={() => void apagar(relatorio.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-leadnexi-danger"
                >
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <MensagemParaOCliente mensagem={relatorio.message} telefone={cliente.lead.phone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Resumo da semana pronto para mandar ao cliente: copiar ou abrir no WhatsApp. */
function MensagemParaOCliente({ mensagem, telefone }: { mensagem: string; telefone: string | null }) {
  const [copiado, setCopiado] = useState(false)
  const link = telefone ? linkDoWhatsApp(telefone, mensagem) : null
  return (
    <details className="mt-3 rounded-lg border border-border">
      <summary className="cursor-pointer px-3 py-2 text-[13px] font-bold text-leadnexi-cyan-texto">Mensagem para o cliente</summary>
      <p className="m-0 whitespace-pre-wrap border-t border-border px-3 py-2 text-[13px] leading-5 text-foreground">{mensagem}</p>
      <div className="flex flex-wrap justify-end gap-1 border-t border-border p-2">
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(mensagem).then(() => setCopiado(true))}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {copiado ? <Check aria-hidden className="h-4 w-4" strokeWidth={1.75} /> : <Copy aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-whatsapp px-3 text-[13px] font-bold text-whatsapp-foreground no-underline hover:bg-whatsapp/90">
            <WhatsAppLogo aria-hidden size={15} />
            WhatsApp
          </a>
        )}
      </div>
    </details>
  )
}

function AbaCobranca({ cliente, onAtualizado }: AbaProps) {
  const [periodo, setPeriodo] = useState(cliente.billing.period)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { billing } = cliente

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const valor = lerReais(String(dados.get('amount') ?? ''))
    if (valor === null || Number.isNaN(valor) || valor <= 0) return setErro('Digite o valor recebido, como 500,00.')
    setErro(null)
    setSalvando(true)
    try {
      onAtualizado(await registrarPagamento(cliente.id, { amount: valor, period: periodo, note: String(dados.get('note') ?? '').trim() || undefined }))
      addToast('success', 'Pagamento registrado')
    } catch (e) {
      setErro(motivo(e, 'Não foi possível registrar. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  const apagar = async (pagamentoId: string) => {
    try {
      onAtualizado(await apagarPagamento(cliente.id, pagamentoId))
    } catch (e) {
      addToast('error', 'Não foi possível apagar', motivo(e, 'Tente de novo.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cn(caixa, billing.overdue ? 'border-leadnexi-danger/50' : billing.remind && 'border-warn-border')}>
        <p className="m-0 text-xs font-semibold text-muted-foreground">Próxima cobrança</p>
        <p className="m-0 mt-1 text-2xl font-extrabold tabular-nums text-foreground">{formatarReais(Number(cliente.monthlyFee))}</p>
        <p className={cn('m-0 mt-1 text-[13px] font-bold first-letter:uppercase', corDaCobranca(billing))}>
          {nomeDoMes(billing.period)} · {textoDaCobranca(billing)}
        </p>
      </section>

      <form noValidate onSubmit={(e) => void registrar(e)} className={cn(caixa, 'flex flex-col gap-4')}>
        <h3 className="m-0 text-sm font-bold text-foreground">Registrar Pix recebido</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="payment-amount" rotulo="Valor (R$)">
            <Input id="payment-amount" name="amount" inputMode="decimal" className="tabular-nums" defaultValue={reaisParaCampo(cliente.monthlyFee)} />
          </Campo>
          <Campo id="payment-period" rotulo="Mês que paga">
            <Input id="payment-period" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </Campo>
        </div>
        <Campo id="payment-note" rotulo="Observação (opcional)">
          <Input id="payment-note" name="note" maxLength={280} placeholder="Ex.: Pix do sócio" />
        </Campo>
        {erro && <MensagemDeErro texto={erro} />}
        <div className="flex justify-end">
          <Button type="submit" className={botaoPrincipalDoTopo} disabled={salvando}>
            {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            Registrar pagamento
          </Button>
        </div>
      </form>

      {cliente.payments.length > 0 && (
        <section aria-labelledby="pagamentos" className="flex flex-col gap-2">
          <h3 id="pagamentos" className="m-0 text-xs font-semibold text-muted-foreground">
            Pagamentos recebidos
          </h3>
          <ul className="m-0 flex flex-col gap-2 p-0">
            {cliente.payments.map((pagamento) => (
              <li key={pagamento.id} className={cn(caixa, 'flex list-none items-center gap-3 py-3')}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold tabular-nums text-success-foreground">{formatarReais(Number(pagamento.amount))}</span>
                  <span className="block text-xs font-medium text-muted-foreground first-letter:uppercase">
                    {nomeDoMes(pagamento.period)} · pago em {new Date(pagamento.paidAt).toLocaleDateString('pt-BR')}
                    {pagamento.note && ` · ${pagamento.note}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Apagar pagamento"
                  onClick={() => void apagar(pagamento.id)}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-leadnexi-danger"
                >
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={caixa}>
      <p className="m-0 text-xs font-semibold text-muted-foreground">{rotulo}</p>
      <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-foreground">{valor}</p>
    </div>
  )
}
