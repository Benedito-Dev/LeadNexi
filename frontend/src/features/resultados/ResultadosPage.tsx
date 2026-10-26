import { useEffect, useState } from 'react'
import { BarChart3, CalendarRange, CircleAlert, Flame, MessageCircleReply, Timer, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { CartaoDeNumero } from '@/components/ui/cartao-de-numero'
import { Selo } from '@/components/ui/selo'
import { cn } from '@/lib/utils'
import { formatarReais } from '../crm/filtros'
import { buscarPainel } from '../hoje/api'
import type { PainelDeHoje } from '../hoje/tipos'
import { buscarPlacar } from './api'
import type { DesempenhoDaMensagem, Funil, Placar } from './tipos'

const porcento = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const taxa = (valor: number | null) => (valor === null ? '—' : porcento.format(valor))

/** Nome de cada mensagem da cadência (o id que o servidor grava em cada envio). */
const NOMES_DAS_MENSAGENS: Record<string, string> = {
  'prospeccao-fria-passo-1': '1ª mensagem',
  'prospeccao-fria-passo-2': 'Retomada',
  'prospeccao-fria-passo-3': 'Última',
}

const cartao = 'rounded-xl border border-border bg-card p-5'

type Periodo = 'semana' | 'mes'

/** Textos que mudam com a chave Semana/Mês. */
const NO_PERIODO: Record<Periodo, { nesta: string; da: string }> = {
  semana: { nesta: 'nesta semana', da: 'da semana' },
  mes: { nesta: 'neste mês', da: 'do mês' },
}

/** Resultados: o placar da prospecção (semana e mês), o funil e como cada mensagem está indo. */
export function ResultadosPage() {
  const [placar, setPlacar] = useState<Placar | null>(null)
  const [painel, setPainel] = useState<PainelDeHoje | null>(null)
  const [erro, setErro] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('semana')

  useEffect(() => {
    Promise.all([buscarPlacar(), buscarPainel()])
      .then(([p, h]) => {
        setPlacar(p)
        setPainel(h)
      })
      .catch(() => setErro(true))
  }, [])

  const funil = placar ? (periodo === 'semana' ? placar.weekly : placar.monthly) : null

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Resultados · LeadNexi</title>
      <ListPageHeader
        icon={BarChart3}
        title="Resultados"
        summary="Como a prospecção está indo"
        actions={
          <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Período">
            {(
              [
                ['semana', 'Semana'],
                ['mes', 'Mês'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button key={valor} type="button" role="tab" aria-selected={periodo === valor} onClick={() => setPeriodo(valor)} className={segmento(periodo === valor)}>
                {rotulo}
              </button>
            ))}
          </div>
        }
      />

      {erro ? (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-leadnexi-danger/40 bg-card p-5 text-sm font-semibold text-foreground">
          <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
          Não foi possível carregar o placar. Atualize a página para tentar de novo.
        </p>
      ) : !placar || !painel || !funil ? (
        <div aria-busy="true" aria-label="Carregando placar" className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <>
          {placar.decisionAlert && <AvisoDeTroca alerta={placar.decisionAlert} />}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoDeNumero
              Icone={CalendarRange}
              tom="ciano"
              rotulo={`Contatos ${NO_PERIODO[periodo].da}`}
              valor={String(funil.contacted.count)}
              // Só existe meta semanal de contatos
              meta={periodo === 'semana' ? placar.settings.weeklyTarget : undefined}
              detalhe={periodo === 'semana' ? `Meta de ${placar.settings.weeklyTarget}` : 'Lojas que receberam a 1ª mensagem'}
            />
            <CartaoDeNumero
              Icone={MessageCircleReply}
              tom="violeta"
              rotulo="Taxa de resposta"
              valor={taxa(funil.responded.rate)}
              detalhe={`${funil.responded.count} de ${funil.contacted.count} responderam ${NO_PERIODO[periodo].nesta}`}
            />
            <CartaoDeNumero
              Icone={Wallet}
              tom="verde"
              rotulo={`Faturamento ${NO_PERIODO[periodo].da}`}
              valor={formatarReais(funil.revenue)}
              // A meta de faturamento é mensal
              meta={periodo === 'mes' ? placar.settings.monthlyRevenueGoal : undefined}
              atual={funil.revenue}
              detalhe={periodo === 'mes' ? `Meta de ${formatarReais(placar.settings.monthlyRevenueGoal)}` : 'Clientes fechados nesta semana'}
            />
            <CartaoDeNumero
              Icone={Flame}
              tom="ambar"
              rotulo="Dias de ritmo"
              valor={String(placar.streakDays)}
              detalhe={`Dias seguidos com ${placar.settings.dailyTarget} ou mais 1ºs contatos`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ContatosPorDia dias={periodo === 'semana' ? painel.week : painel.month} periodo={periodo} metaDiaria={placar.settings.dailyTarget} />
            <section aria-labelledby="funil" className={cartao}>
              <h2 id="funil" className="m-0 text-base font-extrabold text-foreground">
                Funil {NO_PERIODO[periodo].da}
              </h2>
              <FunilEmBarras funil={funil} />
              {placar.averageFirstResponseHours !== null && (
                <p className="mb-0 mt-4 flex items-center gap-2 border-t border-border pt-4 text-[13px] font-medium text-muted-foreground">
                  <Timer aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  Em média, o lead responde{' '}
                  <span className="font-bold tabular-nums text-foreground">
                    {placar.averageFirstResponseHours < 1 ? 'em menos de 1 hora' : `em ${Math.round(placar.averageFirstResponseHours)} h`}
                  </span>
                  depois da 1ª mensagem.
                </p>
              )}
            </section>
          </div>

          <TabelaDeMensagens mensagens={placar.messagePerformance[periodo === 'semana' ? 'week' : 'month']} periodo={periodo} />
        </>
      )}
    </div>
  )
}

/** Uma lista bateu a regra de troca: muitos contatos e poucas respostas. */
function AvisoDeTroca({ alerta }: { alerta: NonNullable<Placar['decisionAlert']> }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-4 rounded-xl border border-warn-border bg-card p-5">
      <Selo Icone={CircleAlert} tom="ambar" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-foreground">Hora de trocar o nicho ou a mensagem</p>
        <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">
          A lista {alerta.name} teve {alerta.contacts} contatos e só {alerta.replies} {alerta.replies === 1 ? 'resposta' : 'respostas'} (a regra pede{' '}
          {alerta.minimumReplies} a cada {alerta.threshold}).
        </p>
      </div>
      <Link to="/configuracoes/prospeccao" className="text-[13px] font-bold text-leadnexi-cyan-texto no-underline hover:underline">
        Ajustar a regra
      </Link>
    </div>
  )
}

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** 1ºs contatos de cada dia (semana ou mês até hoje), com a linha da meta diária. */
function ContatosPorDia({ dias, periodo, metaDiaria }: { dias: PainelDeHoje['week']; periodo: Periodo; metaDiaria: number }) {
  const [hoje] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date()))
  const teto = Math.max(metaDiaria, ...dias.map((d) => d.firstContacts), 1)
  const total = dias.reduce((soma, d) => soma + d.firstContacts, 0)
  const noMes = periodo === 'mes'
  // No mês, o rótulo vai a cada 5 dias (e no dia de hoje) para não embolar
  const rotulo = (data: string, i: number) =>
    data === hoje ? 'Hoje' : noMes ? (Number(data.slice(8)) % 5 === 0 || i === 0 ? String(Number(data.slice(8))) : '') : DIAS[i]
  const colunas = { gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }

  return (
    <section aria-labelledby="contatos-por-dia" className={cartao}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="contatos-por-dia" className="m-0 text-base font-extrabold text-foreground">
          1ºs contatos por dia
        </h2>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">{total} no total</span>
      </div>
      <div className="relative mt-6 h-44">
        {/* Linha da meta diária */}
        <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-muted-foreground/50" style={{ bottom: `${(metaDiaria / teto) * 100}%` }}>
          <span className="absolute -top-5 right-0 text-[11px] font-semibold text-muted-foreground">meta {metaDiaria}</span>
        </div>
        <ol className={cn('m-0 grid h-full items-end p-0', noMes ? 'gap-1' : 'gap-2')} style={colunas}>
          {dias.map((dia, i) => (
            <li
              key={dia.date}
              className="flex h-full flex-col items-center justify-end gap-1.5"
              title={`${noMes ? `Dia ${Number(dia.date.slice(8))}` : DIAS[i]}: ${dia.firstContacts} ${dia.firstContacts === 1 ? 'contato' : 'contatos'}`}
            >
              {!noMes && <span className="text-xs font-bold tabular-nums text-foreground">{dia.firstContacts > 0 ? dia.firstContacts : ''}</span>}
              <span
                className={cn('w-full max-w-9 rounded-t-[4px] transition-[height]', dia.firstContacts >= metaDiaria ? 'bg-leadnexi-violet' : 'bg-leadnexi-violet/40')}
                style={{ height: `${(dia.firstContacts / teto) * 100}%`, minHeight: dia.firstContacts > 0 ? 4 : 0 }}
              />
            </li>
          ))}
        </ol>
      </div>
      <ol className={cn('m-0 mt-2 grid border-t border-border p-0 pt-2', noMes ? 'gap-1' : 'gap-2')} style={colunas}>
        {dias.map((dia, i) => (
          <li key={dia.date} className={cn('whitespace-nowrap text-center text-xs font-semibold', dia.date === hoje ? 'text-foreground' : 'text-muted-foreground')}>
            {rotulo(dia.date, i)}
          </li>
        ))}
      </ol>
    </section>
  )
}

const ETAPAS_DO_FUNIL: { chave: keyof Omit<Funil, 'revenue'>; rotulo: string }[] = [
  { chave: 'contacted', rotulo: 'Contatados' },
  { chave: 'responded', rotulo: 'Responderam' },
  { chave: 'meeting', rotulo: 'Reunião' },
  { chave: 'proposal', rotulo: 'Proposta' },
  { chave: 'won', rotulo: 'Fecharam' },
]

/** Cada etapa como barra proporcional aos contatados do período, com o número e a taxa. */
function FunilEmBarras({ funil }: { funil: Funil }) {
  const total = funil.contacted.count
  return (
    <ol className="m-0 mt-5 flex flex-col gap-3 p-0">
      {ETAPAS_DO_FUNIL.map(({ chave, rotulo }, i) => {
        const etapa = funil[chave]
        const largura = total > 0 ? (etapa.count / total) * 100 : 0
        return (
          <li key={chave} className="grid grid-cols-[96px_minmax(0,1fr)_88px] items-center gap-3" title={`${rotulo}: ${etapa.count}`}>
            <span className="text-[13px] font-semibold text-foreground">{rotulo}</span>
            <span className="h-3 overflow-hidden rounded-[4px] bg-muted">
              <span
                className="block h-full rounded-[4px] bg-leadnexi-violet"
                style={{ width: `${largura}%`, minWidth: etapa.count > 0 ? 4 : 0, opacity: 1 - i * 0.14 }}
              />
            </span>
            <span className="text-right text-[13px] tabular-nums">
              <span className="font-extrabold text-foreground">{etapa.count}</span>
              {i > 0 && <span className="ml-1.5 font-medium text-muted-foreground">{taxa(etapa.rate)}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Quantos receberam cada mensagem no período e quantos responderam. */
function TabelaDeMensagens({ mensagens, periodo }: { mensagens: DesempenhoDaMensagem[]; periodo: Periodo }) {
  return (
    <section aria-labelledby="mensagens" className={cartao}>
      <h2 id="mensagens" className="m-0 text-base font-extrabold text-foreground">
        Mensagens {NO_PERIODO[periodo].da}
      </h2>
      <p className="mb-0 mt-0.5 text-[13px] font-medium text-muted-foreground">Qual texto de 1ª mensagem está trazendo mais resposta.</p>
      {mensagens.length === 0 ? (
        <p className="mb-0 mt-4 text-sm font-medium text-muted-foreground">Nenhuma 1ª mensagem enviada {NO_PERIODO[periodo].nesta} ainda.</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Mensagem</th>
              <th className="py-2 pr-3 text-right font-semibold">Enviadas</th>
              <th className="py-2 pr-3 text-right font-semibold">Respostas</th>
              <th className="py-2 text-right font-semibold">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {mensagens.map((m) => (
              <tr key={`${m.templateId}:${m.variation}`} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-foreground">
                  {NOMES_DAS_MENSAGENS[m.templateId] ?? m.templateId}
                  {m.variation !== 'padrao' && <span className="ml-1.5 font-medium text-muted-foreground">· {m.variation}</span>}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{m.contacts}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{m.responses}</td>
                <td className="py-2.5 text-right font-bold tabular-nums text-foreground">{taxa(m.responseRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
