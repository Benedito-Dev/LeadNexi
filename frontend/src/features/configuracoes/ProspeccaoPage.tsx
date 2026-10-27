import { useEffect, useState, type FormEvent } from 'react'
import { CalendarRange, Clock3, LoaderCircle, MessageSquareText, Repeat2, Target, Wallet, type LucideIcon } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Selo, type TomDoSelo } from '@/components/ui/selo'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import { buscarProspeccao, salvarProspeccao, type Metas, type Prospeccao, type TextosProntos } from './api'

/** Limites de cada meta (os mesmos que o servidor aceita). */
const LIMITES: Record<keyof Metas, { min: number; max: number }> = {
  dailyTarget: { min: 1, max: 100 },
  weeklyTarget: { min: 1, max: 500 },
  monthlyRevenueGoal: { min: 0, max: 10_000_000 },
  decisionContacts: { min: 1, max: 500 },
  decisionMinReplies: { min: 1, max: 100 },
}

const cartao = 'rounded-xl border border-border bg-card p-6'

/** Os textos prontos da cadência, na ordem em que saem. */
const TEXTOS: { chave: keyof TextosProntos; rotulo: string; dica: string }[] = [
  { chave: 'messageFirst', rotulo: '1ª mensagem', dica: 'O primeiro contato com a loja.' },
  { chave: 'messageFollowUp', rotulo: 'Retomada', dica: 'O 1º follow-up, quando a loja ainda não respondeu.' },
  { chave: 'messageLast', rotulo: 'Última', dica: 'O follow-up final, sem pressão.' },
]

const LIMITE_DO_TEXTO = 1000

/** Configurações › Prospecção: as metas e os textos prontos que a tela Hoje e Resultados usam. */
export function ProspeccaoPage() {
  const [salvas, setSalvas] = useState<Prospeccao | null>(null)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)

  useEffect(() => {
    buscarProspeccao()
      .then(setSalvas)
      .catch(() => setErroAoCarregar(true))
  }, [])

  if (erroAoCarregar) {
    return (
      <div className={cartao}>
        <MensagemDeErro texto="Não foi possível carregar as configurações. Atualize a página para tentar de novo." />
      </div>
    )
  }
  if (!salvas) return <div aria-busy="true" aria-label="Carregando configurações" className="h-72 animate-pulse rounded-xl border border-border bg-card" />
  // A chave remonta o formulário com os valores salvos (ao salvar ou ao desfazer)
  return <Formulario key={JSON.stringify(salvas)} salvas={salvas} onSalvas={setSalvas} />
}

function Formulario({ salvas, onSalvas }: { salvas: Prospeccao; onSalvas: (valores: Prospeccao) => void }) {
  const [valores, setValores] = useState<Record<keyof Prospeccao, string>>(() => paraTexto(salvas))
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
      (Object.keys(LIMITES) as (keyof Metas)[]).map((chave) => [chave, Number(valores[chave].replace(/\./g, '').replace(',', '.'))]),
    ) as Metas
    const textos = Object.fromEntries(TEXTOS.map(({ chave }) => [chave, valores[chave]])) as TextosProntos
    const invalida = (Object.keys(LIMITES) as (keyof Metas)[]).find((chave) => {
      const valor = metas[chave]
      const inteiro = chave !== 'monthlyRevenueGoal'
      return !Number.isFinite(valor) || (inteiro && !Number.isInteger(valor)) || valor < LIMITES[chave].min || valor > LIMITES[chave].max
    })
    if (invalida) {
      setErro(`Confira "${ROTULOS[invalida]}": use um número entre ${LIMITES[invalida].min} e ${LIMITES[invalida].max.toLocaleString('pt-BR')}.`)
      return
    }
    const longo = TEXTOS.find(({ chave }) => textos[chave].length > LIMITE_DO_TEXTO)
    if (longo) {
      setErro(`Confira "${longo.rotulo}": use no máximo ${LIMITE_DO_TEXTO.toLocaleString('pt-BR')} caracteres.`)
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      onSalvas(await salvarProspeccao({ ...metas, ...textos }))
      addToast('success', 'Configurações salvas', 'A tela Hoje já usa os valores novos.')
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

      <section aria-labelledby="textos" className="flex gap-4 rounded-xl border border-border bg-card p-6">
        <Selo Icone={MessageSquareText} tom="violeta" />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <Titulo id="textos" titulo="Mensagens prontas" texto="Os textos que a tela Hoje já deixa escritos para cada loja. Deixe um campo vazio para voltar ao texto padrão." />
            <p className="mb-0 mt-2 text-[13px] font-medium text-muted-foreground">
              Troca sozinho: <Marcador>{'{saudacao}'}</Marcador> vira "Bom dia", "Boa tarde" ou "Boa noite"; <Marcador>{'{loja}'}</Marcador> vira o nome
              da loja; <Marcador>{'{data}'}</Marcador> vira o dia da última mensagem.
            </p>
          </div>
          {TEXTOS.map(({ chave, rotulo, dica }) => (
            <div key={chave} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={chave} className="text-sm font-bold text-foreground">
                  {rotulo} <span className="font-medium text-muted-foreground">· {dica}</span>
                </label>
                <span className={cn('text-xs font-semibold tabular-nums', valores[chave].length > LIMITE_DO_TEXTO ? 'text-leadnexi-danger' : 'text-muted-foreground')}>
                  {valores[chave].length}/{LIMITE_DO_TEXTO.toLocaleString('pt-BR')}
                </span>
              </div>
              <Textarea
                id={chave}
                value={valores[chave]}
                onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                rows={3}
                className="min-h-20 resize-y text-sm leading-6 [field-sizing:content] max-h-72"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Dias da cadência: etapa 5 do mapa (docs/produto/MAPA.md) */}
      <p className="m-0 flex items-center gap-2.5 rounded-xl border border-dashed border-border px-5 py-4 text-[13px] font-medium text-muted-foreground">
        <Clock3 aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Em breve aqui: os dias entre um follow-up e outro.
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

function Marcador({ children }: { children: string }) {
  return <code className="rounded border border-border bg-muted px-1 py-px font-mono text-xs font-semibold text-foreground">{children}</code>
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
  tom: TomDoSelo
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
function paraTexto(metas: Prospeccao): Record<keyof Prospeccao, string> {
  return {
    messageFirst: metas.messageFirst,
    messageFollowUp: metas.messageFollowUp,
    messageLast: metas.messageLast,
    dailyTarget: String(metas.dailyTarget),
    weeklyTarget: String(metas.weeklyTarget),
    monthlyRevenueGoal: String(metas.monthlyRevenueGoal).replace('.', ','),
    decisionContacts: String(metas.decisionContacts),
    decisionMinReplies: String(metas.decisionMinReplies),
  }
}
