import { useEffect, useState, type FormEvent } from 'react'
import { CalendarRange, Clock3, LoaderCircle, Repeat2, Target, Wallet, type LucideIcon } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import { buscarMetas, salvarMetas, type Metas } from './api'

/** Limites de cada meta (os mesmos que o servidor aceita). */
const LIMITES: Record<keyof Metas, { min: number; max: number }> = {
  dailyTarget: { min: 1, max: 100 },
  weeklyTarget: { min: 1, max: 500 },
  monthlyRevenueGoal: { min: 0, max: 10_000_000 },
  decisionContacts: { min: 1, max: 500 },
  decisionMinReplies: { min: 1, max: 100 },
}

const cartao = 'rounded-xl border border-border bg-card p-6'

/** Configurações › Prospecção: as metas que a tela Hoje e Resultados usam. */
export function ProspeccaoPage() {
  const [salvas, setSalvas] = useState<Metas | null>(null)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)

  useEffect(() => {
    buscarMetas()
      .then(setSalvas)
      .catch(() => setErroAoCarregar(true))
  }, [])

  if (erroAoCarregar) {
    return (
      <div className={cartao}>
        <MensagemDeErro texto="Não foi possível carregar as metas. Atualize a página para tentar de novo." />
      </div>
    )
  }
  if (!salvas) return <div aria-busy="true" aria-label="Carregando metas" className="h-72 animate-pulse rounded-xl border border-border bg-card" />
  // A chave remonta o formulário com os valores salvos (ao salvar ou ao desfazer)
  return <Formulario key={JSON.stringify(salvas)} salvas={salvas} onSalvas={setSalvas} />
}

function Formulario({ salvas, onSalvas }: { salvas: Metas; onSalvas: (metas: Metas) => void }) {
  const [valores, setValores] = useState<Record<keyof Metas, string>>(() => paraTexto(salvas))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const mudou = JSON.stringify(valores) !== JSON.stringify(paraTexto(salvas))

  const campo = (chave: keyof Metas) => ({
    id: chave,
    value: valores[chave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValores((v) => ({ ...v, [chave]: e.target.value })),
    inputMode: 'numeric' as const,
  })

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const metas = Object.fromEntries(
      Object.entries(valores).map(([chave, texto]) => [chave, Number(texto.replace(/\./g, '').replace(',', '.'))]),
    ) as Metas
    const invalida = (Object.keys(LIMITES) as (keyof Metas)[]).find((chave) => {
      const valor = metas[chave]
      const inteiro = chave !== 'monthlyRevenueGoal'
      return !Number.isFinite(valor) || (inteiro && !Number.isInteger(valor)) || valor < LIMITES[chave].min || valor > LIMITES[chave].max
    })
    if (invalida) {
      setErro(`Confira "${ROTULOS[invalida]}": use um número entre ${LIMITES[invalida].min} e ${LIMITES[invalida].max.toLocaleString('pt-BR')}.`)
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      onSalvas(await salvarMetas(metas))
      addToast('success', 'Metas salvas', 'A tela Hoje já usa os valores novos.')
    } catch (e) {
      setErro(e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form noValidate onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
      <section aria-labelledby="metas" className="flex flex-col gap-3">
        <Titulo id="metas" titulo="Metas" texto="O ritmo que a tela Hoje cobra e o placar mede." />
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoDeMeta
            Icone={Target}
            tom="violeta"
            rotulo={ROTULOS.dailyTarget}
            unidade="ações"
            dica="A missão do dia na tela Hoje. Mensagens, follow-ups e respostas contam."
            {...campo('dailyTarget')}
          />
          <CartaoDeMeta
            Icone={CalendarRange}
            tom="ciano"
            rotulo={ROTULOS.weeklyTarget}
            unidade="contatos"
            dica="Mensagens enviadas de segunda a domingo."
            {...campo('weeklyTarget')}
          />
          <CartaoDeMeta
            Icone={Wallet}
            tom="verde"
            rotulo={ROTULOS.monthlyRevenueGoal}
            prefixo="R$"
            dica="Soma dos clientes fechados no mês."
            {...campo('monthlyRevenueGoal')}
            inputMode="decimal"
          />
        </div>
      </section>

      <section aria-labelledby="regra" className="flex gap-4 rounded-xl border border-border bg-card p-6">
        <Selo Icone={Repeat2} tom="ambar" />
        <div className="min-w-0 flex-1">
          <Titulo id="regra" titulo="Regra de troca" texto="Quando uma lista não está dando resposta, Resultados avisa para trocar o nicho ou a mensagem." />
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] font-semibold text-foreground">
            <span>A cada</span>
            <Input {...campo('decisionContacts')} aria-label={ROTULOS.decisionContacts} className={numeroPequeno} />
            <span>contatos numa lista, se responderem menos de</span>
            <Input {...campo('decisionMinReplies')} aria-label={ROTULOS.decisionMinReplies} className={numeroPequeno} />
            <span>, avisar.</span>
          </div>
        </div>
      </section>

      {/* Dias da cadência e modelos de mensagem: etapa 5 do mapa (docs/produto/MAPA.md) */}
      <p className="m-0 flex items-center gap-2.5 rounded-xl border border-dashed border-border px-5 py-4 text-[13px] font-medium text-muted-foreground">
        <Clock3 aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Em breve aqui: os dias entre um follow-up e outro e os textos das mensagens prontas.
      </p>

      {erro && <MensagemDeErro texto={erro} />}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {mudou && <span className="mr-auto text-[13px] font-semibold text-warn-foreground">Alterações não salvas</span>}
        {mudou && (
          <Button type="button" variant="outline" className={botaoSecundarioDoTopo} onClick={() => setValores(paraTexto(salvas))} disabled={salvando}>
            Desfazer
          </Button>
        )}
        <Button type="submit" className={botaoPrincipalDoTopo} disabled={!mudou || salvando}>
          {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
          Salvar
        </Button>
      </div>
    </form>
  )
}

const numeroPequeno = 'h-11 w-20 text-center text-lg font-extrabold tabular-nums'

/** Cor de cada sinal: violeta (ação), ciano (ritmo), verde (dinheiro), âmbar (alerta). */
const TONS = {
  violeta: 'bg-leadnexi-violet/15 text-leadnexi-violet-texto',
  ciano: 'bg-leadnexi-cyan/15 text-leadnexi-cyan-texto',
  verde: 'bg-success text-success-foreground',
  ambar: 'bg-warn-foreground/15 text-warn-foreground',
}

function Selo({ Icone, tom }: { Icone: LucideIcon; tom: keyof typeof TONS }) {
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', TONS[tom])}>
      <Icone aria-hidden className="h-5 w-5" strokeWidth={1.75} />
    </span>
  )
}

function Titulo({ id, titulo, texto }: { id: string; titulo: string; texto: string }) {
  return (
    <div>
      <h2 id={id} className="m-0 text-lg font-extrabold tracking-[-0.02em] text-foreground">
        {titulo}
      </h2>
      <p className="mb-0 mt-0.5 text-sm font-medium text-muted-foreground">{texto}</p>
    </div>
  )
}

/** Uma meta: selo colorido, rótulo, o número grande editável (com unidade) e a explicação. */
function CartaoDeMeta({
  Icone,
  tom,
  rotulo,
  unidade,
  prefixo,
  dica,
  ...input
}: {
  Icone: LucideIcon
  tom: keyof typeof TONS
  rotulo: string
  unidade?: string
  prefixo?: string
  dica: string
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Selo Icone={Icone} tom={tom} />
        <label htmlFor={input.id} className="text-sm font-bold text-foreground">
          {rotulo}
        </label>
      </div>
      <div className="flex items-baseline gap-2">
        {prefixo && <span className="text-lg font-bold text-muted-foreground">{prefixo}</span>}
        <Input {...input} className="h-12 w-32 text-2xl font-extrabold tabular-nums" />
        {unidade && <span className="text-sm font-semibold text-muted-foreground">{unidade}</span>}
      </div>
      <p className="m-0 text-xs font-medium leading-5 text-muted-foreground">{dica}</p>
    </div>
  )
}

const ROTULOS: Record<keyof Metas, string> = {
  dailyTarget: 'Ações por dia',
  weeklyTarget: 'Contatos por semana',
  monthlyRevenueGoal: 'Faturamento do mês',
  decisionContacts: 'Contatos por lista',
  decisionMinReplies: 'Respostas mínimas',
}

/** Valores salvos como texto dos campos (faturamento com vírgula decimal). */
function paraTexto(metas: Metas): Record<keyof Metas, string> {
  return {
    dailyTarget: String(metas.dailyTarget),
    weeklyTarget: String(metas.weeklyTarget),
    monthlyRevenueGoal: String(metas.monthlyRevenueGoal).replace('.', ','),
    decisionContacts: String(metas.decisionContacts),
    decisionMinReplies: String(metas.decisionMinReplies),
  }
}
