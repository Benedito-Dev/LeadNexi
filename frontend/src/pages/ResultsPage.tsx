import { AlertTriangle, BarChart3, Check, Clock3, MessageCircle, Save, Target, Trophy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ProofsCard } from '../features/ai/components/ProofsCard.tsx'
import { useResultsDashboard, useUpdateProspectingSettings } from '../features/results/hooks.ts'
import type { FunnelPeriod, ProspectingSettings } from '../features/results/types.ts'
import { formatPercent } from '../lib/format.ts'

const FUNNEL_ROWS: { key: keyof FunnelPeriod; label: string }[] = [
  { key: 'contacted', label: 'Contatados' },
  { key: 'responded', label: 'Responderam' },
  { key: 'meeting', label: 'Reunião' },
  { key: 'proposal', label: 'Proposta' },
  { key: 'won', label: 'Fechou' },
]

export function ResultsPage() {
  const dashboard = useResultsDashboard()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Resultados" description="Veja o que está funcionando e decida o próximo movimento." />
      {dashboard.isPending ? <ResultsSkeleton /> : dashboard.isError || !dashboard.data ? <ErrorState onRetry={() => void dashboard.refetch()} /> : (
        <>
          {dashboard.data.decisionAlert && <DecisionAlert alert={dashboard.data.decisionAlert} />}
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <StreakCard days={dashboard.data.streakDays} target={dashboard.data.settings.dailyTarget} />
            <MetricCard icon={Clock3} label="Tempo médio até a 1ª resposta" value={dashboard.data.averageFirstResponseHours === null ? '—' : `${dashboard.data.averageFirstResponseHours.toFixed(1)} h`} hint="desde o primeiro contato" tone="cyan" />
            <MetricCard icon={MessageCircle} label="Taxa de resposta" value={formatPercent(dashboard.data.monthly.responded.rate ?? 0)} hint="no mês atual" tone="violet" />
          </div>
          <section className="rounded-xl border bg-navy-750 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-xs font-bold tracking-[0.16em] text-cyan uppercase">Funil por período</p><h2 className="mt-1 text-h2">A conversa precisa avançar</h2></div>
              <div className="flex rounded-md border border-navy-600 p-1" role="tablist" aria-label="Período do funil">
                <PeriodButton active={period === 'weekly'} onClick={() => setPeriod('weekly')}>Esta semana</PeriodButton>
                <PeriodButton active={period === 'monthly'} onClick={() => setPeriod('monthly')}>Este mês</PeriodButton>
              </div>
            </div>
            <Funnel period={dashboard.data[period]} />
          </section>
          <MessageTests performance={dashboard.data.messagePerformance} />
          <SettingsCard settings={dashboard.data.settings} />
          <ProofsCard />
        </>
      )}
    </div>
  )
}

function DecisionAlert({ alert }: { alert: NonNullable<import('../features/results/types.ts').ResultsDashboard['decisionAlert']> }) {
  return (
    <section className="rounded-xl border border-warning/50 bg-warning/10 p-5" role="alert">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning/15 text-warning"><AlertTriangle aria-hidden size={19} /></span><div className="min-w-0"><h2 className="text-ui font-bold text-white">Regra de decisão atingida</h2><p className="mt-1 text-body text-slate-300">A lista <strong className="text-white">{alert.name}</strong> chegou a {alert.contacts} contatos e teve {alert.replies} resposta{alert.replies === 1 ? '' : 's'}.</p><p className="mt-2 text-small font-bold text-warning">Troque o nicho ou a mensagem, não o canal.</p><div className="mt-4 flex flex-wrap gap-2"><a href="#mensagens" className="inline-flex h-9 items-center rounded-sm border border-warning/40 px-3 text-small font-bold text-warning hover:bg-warning/10">Ver mensagens usadas</a><Link to="/leads" className="inline-flex h-9 items-center rounded-sm border border-navy-600 px-3 text-small font-bold text-slate-300 hover:bg-navy-800">Revisar lista</Link></div></div></div>
    </section>
  )
}

function StreakCard({ days, target }: { days: number; target: number }) {
  return <article className="relative overflow-hidden rounded-xl border bg-navy-800 p-5"><div className="absolute -right-8 -bottom-10 size-32 rounded-full border-[20px] border-violet-tint opacity-70" aria-hidden /><div className="relative"><span className="grid size-9 place-items-center rounded-full bg-violet-tint text-violet-300"><Trophy aria-hidden size={19} /></span><p className="mt-4 text-3xl font-extrabold tracking-tight text-white">{days} {days === 1 ? 'dia' : 'dias'}</p><p className="mt-1 text-ui font-bold text-slate-200">Sequência ativa</p><p className="mt-2 text-small text-slate-400">Meta diária: {target} contatos. {days > 0 ? 'Continue nesse ritmo.' : 'O próximo contato começa uma nova sequência.'}</p></div></article>
}

function MetricCard({ icon: Icon, label, value, hint, tone }: { icon: typeof Clock3; label: string; value: string; hint: string; tone: 'cyan' | 'violet' }) {
  return <article className="rounded-xl border bg-navy-750 p-5"><span className={`grid size-9 place-items-center rounded-full ${tone === 'cyan' ? 'bg-cyan-tint text-cyan' : 'bg-violet-tint text-violet-300'}`}><Icon aria-hidden size={19} /></span><p className="mt-4 text-2xl font-extrabold tracking-tight text-white">{value}</p><p className="mt-1 text-ui font-bold text-slate-200">{label}</p><p className="mt-2 text-small text-slate-400">{hint}</p></article>
}

function Funnel({ period }: { period: FunnelPeriod }) {
  const max = Math.max(period.contacted.count, 1)
  return <div className="mt-6 grid gap-3">{FUNNEL_ROWS.map(({ key, label }) => { const metric = period[key]; return <div key={key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3"><span className="text-small font-bold text-slate-300">{label}</span><div className="h-3 overflow-hidden rounded-full bg-navy-800"><span className={`block h-full rounded-full ${key === 'won' ? 'bg-success' : 'bg-cyan'}`} style={{ width: `${Math.max((metric.count / max) * 100, metric.count > 0 ? 6 : 0)}%` }} /></div><span className="min-w-20 text-right text-small font-bold text-white tabular-nums">{metric.count} <span className="font-medium text-slate-500">{metric.rate === null ? '—' : formatPercent(metric.rate)}</span></span></div> })}</div>
}

function MessageTests({ performance }: { performance: import('../features/results/types.ts').MessagePerformance[] }) {
  return <section id="mensagens" className="rounded-xl border bg-navy-750 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.16em] text-cyan uppercase">Teste de mensagens</p><h2 className="mt-1 text-h2">Qual abordagem responde mais?</h2></div><BarChart3 aria-hidden className="text-slate-500" /></div>{performance.length === 0 ? <p className="mt-6 rounded-md border border-dashed border-navy-600 px-4 py-6 text-center text-small text-slate-400">Ainda não há mensagens classificadas neste período.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-navy-600 text-small text-slate-400"><th className="px-3 py-3 font-semibold">Template</th><th className="px-3 py-3 text-right font-semibold">Contatos</th><th className="px-3 py-3 text-right font-semibold">Respostas</th><th className="px-3 py-3 text-right font-semibold">Taxa</th></tr></thead><tbody>{performance.map((row) => <tr key={`${row.templateId}-${row.variation}`} className="border-b border-navy-700 last:border-0"><td className="px-3 py-3"><span className="block text-small font-bold text-white">{row.templateId}</span><span className="text-xs text-slate-500">{row.variation}</span></td><td className="px-3 py-3 text-right text-small font-bold text-slate-300 tabular-nums">{row.contacts}</td><td className="px-3 py-3 text-right text-small font-bold text-slate-300 tabular-nums">{row.responses}</td><td className="px-3 py-3 text-right text-small font-bold text-cyan tabular-nums">{row.responseRate === null ? '—' : formatPercent(row.responseRate)}</td></tr>)}</tbody></table></div>}</section>
}

function SettingsCard({ settings }: { settings: ProspectingSettings }) {
  const [form, setForm] = useState({ ...settings })
  const update = useUpdateProspectingSettings()
  function change(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: Number(value) })) }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); update.mutate(form) }
  return (
    <section className="rounded-xl border bg-navy-750 p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-full bg-slate-tint text-slate-300"><Target aria-hidden size={19} /></span><div><p className="text-xs font-bold tracking-[0.16em] text-cyan uppercase">Configurações</p><h2 className="mt-1 text-h2">Metas da operação</h2><p className="mt-1 text-small text-slate-400">Esses limites alimentam o placar da tela Hoje e a regra de decisão.</p></div></div>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingField label="Contatos por dia" value={form.dailyTarget} onChange={(value) => change('dailyTarget', value)} />
        <SettingField label="Contatos por semana" value={form.weeklyTarget} onChange={(value) => change('weeklyTarget', value)} />
        <SettingField label="Faturamento mensal (R$)" value={form.monthlyRevenueGoal} onChange={(value) => change('monthlyRevenueGoal', value)} step="0.01" />
        <SettingField label="Limite diário de mensagens" value={form.dailyLimit} onChange={(value) => change('dailyLimit', value)} />
        <SettingField label="Contatos até revisar" value={form.decisionContacts} onChange={(value) => change('decisionContacts', value)} />
        <SettingField label="Respostas mínimas" value={form.decisionMinReplies} onChange={(value) => change('decisionMinReplies', value)} />
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={update.isPending}><Save aria-hidden size={16} />{update.isPending ? 'Salvando…' : 'Salvar metas'}</Button>{update.isSuccess && <span className="flex items-center gap-1 text-small font-bold text-success"><Check aria-hidden size={16} />Metas salvas</span>}{update.error && <span className="text-small font-bold text-danger">Não foi possível salvar.</span>}</div>
      </form>
    </section>
  )
}

function SettingField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (value: string) => void; step?: string }) {
  return <label className="flex flex-col gap-2 text-small font-semibold text-slate-300">{label}<Input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function PeriodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`cursor-pointer rounded-sm px-3 py-2 text-small font-bold transition-colors ${active ? 'bg-cyan-tint text-cyan' : 'text-slate-400 hover:text-white'}`}>{children}</button>
}

function ResultsSkeleton() { return <div aria-busy="true" className="grid gap-4"><div className="h-32 animate-pulse rounded-xl border bg-navy-800" /><div className="h-72 animate-pulse rounded-xl border bg-navy-800" /><div className="h-48 animate-pulse rounded-xl border bg-navy-800" /></div> }

function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="rounded-lg border border-danger/40 bg-navy-800 p-6"><p className="text-ui font-bold text-white">Não foi possível carregar os resultados.</p><Button variant="secondary" className="mt-4 h-9 px-3.5" onClick={onRetry}>Tentar de novo</Button></div> }
