import { Check, CircleAlert, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { LeadAvatar } from '../features/leads/components/LeadAvatar.tsx'
import { LeadFormDialog, type LeadFormTarget } from '../features/leads/components/LeadFormDialog.tsx'
import { WhatsAppLink } from '../features/leads/components/WhatsAppLink.tsx'
import { useCompleteFollowUp, useFollowUps } from '../features/leads/hooks.ts'
import type { LeadWithStage } from '../features/leads/types.ts'
import { useStageOptions } from '../features/pipelines/useStageOptions.ts'
import { followUpTone, formatDay } from '../lib/format.ts'

type GroupKey = 'overdue' | 'today' | 'tomorrow' | 'later'

const GROUPS: { key: GroupKey; title: string; tone: string }[] = [
  { key: 'overdue', title: 'Atrasados', tone: 'text-danger' },
  { key: 'today', title: 'Hoje', tone: 'text-warning' },
  { key: 'tomorrow', title: 'Amanhã', tone: 'text-slate-300' },
  { key: 'later', title: 'Próximos dias', tone: 'text-slate-300' },
]

/** Em qual grupo o contato cai: já passou, ainda hoje, amanhã ou depois. */
function groupOf(dueAt: string): GroupKey {
  const tone = followUpTone(dueAt)
  if (tone !== 'future') return tone
  return formatDay(new Date(dueAt)) === 'Amanhã' ? 'tomorrow' : 'later'
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Tela "Hoje" (BRAND.md, seção 9.2): a agenda de contatos. Atrasados, hoje, amanhã e próximos dias,
// com WhatsApp e "Feito" em cada linha; clicar no lead abre o painel com o histórico.
export function TodayPage() {
  const followUps = useFollowUps()
  const { stageOptions, stageInfo } = useStageOptions()
  const [target, setTarget] = useState<LeadFormTarget | null>(null)

  // Lido uma vez ao abrir a tela (fora da renderização)
  const [today] = useState(() =>
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
  const leads = followUps.data ?? []
  const grouped = GROUPS.map((group) => ({
    ...group,
    leads: leads.filter((lead) => lead.followUpAt && groupOf(lead.followUpAt) === group.key),
  })).filter((group) => group.leads.length > 0)
  const pending = grouped
    .filter((group) => group.key === 'overdue' || group.key === 'today')
    .reduce((sum, group) => sum + group.leads.length, 0)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Hoje"
        description={`${today.charAt(0).toUpperCase()}${today.slice(1)} · ${
          pending === 0 ? 'nada pendente' : `${pending} ${pending === 1 ? 'contato pendente' : 'contatos pendentes'}`
        }`}
      />

      {followUps.isPending ? (
        <div aria-busy="true" aria-label="Carregando contatos" className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-18 animate-pulse rounded-lg border bg-navy-800" />
          ))}
        </div>
      ) : followUps.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar os contatos.</p>
          <Button variant="secondary" onClick={() => void followUps.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10">
          <p className="text-ui font-bold text-white">Nenhum contato agendado.</p>
          <p className="mt-1 text-small text-slate-400">
            Abra um lead no Funil ou em Leads e agende o próximo contato: ele aparece aqui no dia certo.
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.key} aria-labelledby={`grupo-${group.key}`} className="flex flex-col gap-2">
            <h2 id={`grupo-${group.key}`} className={`flex items-center gap-2 text-ui font-bold ${group.tone}`}>
              {group.title}
              <span className="text-small font-semibold text-slate-400 tabular-nums">{group.leads.length}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {group.leads.map((lead) => (
                <FollowUpRow
                  key={lead.id}
                  lead={lead}
                  group={group.key}
                  stage={stageInfo(lead.stageId, lead.stage.name)}
                  onOpen={() => setTarget({ mode: 'edit', lead })}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <LeadFormDialog target={target} stages={stageOptions} onClose={() => setTarget(null)} />
    </div>
  )
}

function FollowUpRow({
  lead,
  group,
  stage,
  onOpen,
}: {
  lead: LeadWithStage
  group: GroupKey
  stage: { label: string; colorClass: string }
  onOpen: () => void
}) {
  const complete = useCompleteFollowUp(lead.id)
  const dueAt = lead.followUpAt ?? ''
  // Hoje e amanhã: só a hora; atrasados e próximos dias: dia + hora
  const when = group === 'today' || group === 'tomorrow' ? timeOf(dueAt) : `${formatDay(new Date(dueAt))}, ${timeOf(dueAt)}`

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-navy-800 py-3 pr-3 pl-4 transition-colors hover:border-navy-600">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
        <LeadAvatar name={lead.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ui font-bold text-white">{lead.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-small text-slate-400">
            {/* No celular a hora vem aqui, para não espremer o nome */}
            <span className={`shrink-0 font-bold tabular-nums sm:hidden ${group === 'overdue' ? 'text-danger' : 'text-slate-300'}`}>
              {when}
            </span>
            <span className="truncate">{lead.followUpNote ?? 'Sem descrição'}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <span aria-hidden className={`size-2 rounded-full ${stage.colorClass}`} />
              {stage.label}
            </span>
          </span>
        </span>
        <time
          dateTime={dueAt}
          className={`hidden shrink-0 text-small font-bold tabular-nums sm:block ${group === 'overdue' ? 'text-danger' : 'text-slate-300'}`}
        >
          {when}
        </time>
      </button>
      <WhatsAppLink name={lead.name} phone={lead.phone} reserveSpace />
      <Button
        variant="secondary"
        className="h-9 px-3"
        onClick={() => complete.mutate()}
        disabled={complete.isPending}
        aria-label={`Marcar contato com ${lead.name} como feito`}
      >
        {complete.isPending ? (
          <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
        ) : complete.isError ? (
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="text-danger" />
        ) : (
          <Check aria-hidden size={16} strokeWidth={1.75} />
        )}
        <span className="hidden sm:inline">Feito</span>
      </Button>
    </li>
  )
}
