import {
  Bot,
  Check,
  ChevronRight,
  FileText,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'

type PrototypeTab = 'mensagem' | 'resposta' | 'resumo' | 'analise'

const TABS: { id: PrototypeTab; label: string; eyebrow: string }[] = [
  { id: 'mensagem', label: 'Mensagem', eyebrow: 'F4.1' },
  { id: 'resposta', label: 'Resposta', eyebrow: 'F4.2' },
  { id: 'resumo', label: 'Resumo', eyebrow: 'F4.3' },
  { id: 'analise', label: 'Análise', eyebrow: 'F4.4' },
]

export function AiPrototypePage() {
  const [tab, setTab] = useState<PrototypeTab>('mensagem')
  const [status, setStatus] = useState('Escolha uma parte da experiência para explorar.')

  function announce(message: string) {
    setStatus(message)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Assistente de prospecção"
        badge={<span className="rounded-full bg-violet-tint px-3 py-1 text-xs font-extrabold tracking-wide text-violet-300">Protótipo F4</span>}
        description="Uma visão de como a IA pode ajudar sem enviar nada por você."
      />

      <PrototypeNotice />
      <LeadContext />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="overflow-hidden rounded-xl border bg-navy-750" aria-label="Experiência do assistente">
          <div className="border-b border-slate-tint px-4 pt-4 sm:px-6 sm:pt-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Partes do protótipo da IA">
              {TABS.map((item) => (
                <TabButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {tab === 'mensagem' && <MessagePanel onAction={announce} />}
            {tab === 'resposta' && <ResponsePanel onAction={announce} />}
            {tab === 'resumo' && <SummaryPanel onAction={announce} />}
            {tab === 'analise' && <AnalysisPanel onAction={announce} />}
          </div>
        </section>

        <AsidePanel onAction={announce} />
      </div>

      <p className="sr-only" aria-live="polite">{status}</p>
      <div className="flex items-center gap-2 text-small text-slate-500" aria-hidden>
        <span className="size-2 rounded-full bg-cyan" />
        <span>{status}</span>
      </div>
    </div>
  )
}

function PrototypeNotice() {
  return (
    <section className="rounded-xl border border-violet/30 bg-violet-tint/40 p-5 sm:p-6" aria-label="Limites do protótipo">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-tint text-violet-300">
          <Bot aria-hidden size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-[0.16em] text-violet-300 uppercase">Dados fictícios para protótipo</p>
          <h2 className="mt-1 text-h2">Você continua no controle</h2>
          <p className="mt-2 max-w-2xl text-body text-slate-300">A IA sugere, você revisa, edita e decide. Esta tela não chama nenhum provedor de IA e não envia mensagens.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <RuleChip>Não envia sozinha</RuleChip>
            <RuleChip>Usa contexto do lead</RuleChip>
            <RuleChip>Sem promessas inventadas</RuleChip>
          </div>
        </div>
      </div>
    </section>
  )
}

function RuleChip({ children }: { children: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-navy-800/50 px-3 py-1.5 text-xs font-bold text-slate-300"><Check aria-hidden size={13} className="text-cyan" />{children}</span>
}

function LeadContext() {
  return (
    <section className="rounded-xl border bg-navy-800 p-4 sm:p-5" aria-label="Contexto do lead de exemplo">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cyan-tint text-lg font-extrabold text-cyan">SA</span>
          <div className="min-w-0">
            <p className="text-ui font-extrabold text-white">Studio Aurora</p>
            <p className="text-small text-slate-400">Aldeota · Fortaleza · Instagram</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-success/10 px-3 py-1.5 text-success">4,8 ★ · 126 avaliações</span>
          <span className="rounded-full bg-warning/10 px-3 py-1.5 text-warning">Anuncia</span>
          <span className="rounded-full bg-violet-tint px-3 py-1.5 text-violet-300">1ª mensagem</span>
        </div>
      </div>
    </section>
  )
}

function TabButton({ item, active, onClick }: { item: (typeof TABS)[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-small font-extrabold transition-colors ${active ? 'bg-violet-600 text-on-accent' : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'}`}
    >
      <span className={active ? 'text-violet-200' : 'text-slate-500'}>{item.eyebrow}</span>
      {item.label}
    </button>
  )
}

function PanelHeading({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: typeof MessageCircle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-tint text-cyan"><Icon aria-hidden size={19} /></span>
      <div>
        <p className="text-xs font-extrabold tracking-[0.16em] text-cyan uppercase">{eyebrow}</p>
        <h2 className="mt-1 text-h2">{title}</h2>
        <p className="mt-1 text-small text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function MessagePanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div>
      <PanelHeading eyebrow="F4.1 · Mensagem sugerida" title="Primeiro contato" description="Uma abordagem curta baseada no contexto público do lead." icon={MessageCircle} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="rounded-lg border border-cyan/30 bg-navy-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-cyan-tint px-2.5 py-1 text-xs font-bold text-cyan">Sugestão principal</span><span className="text-xs text-slate-500">286 caracteres</span></div>
          <p className="mt-4 text-body leading-7 text-slate-200">Oi, Studio Aurora! Vi que vocês já anunciam o trabalho de vocês e fiquei curioso: hoje vocês conseguem saber quais anúncios realmente trazem conversas? Tenho ajudado negócios locais a organizar essa leitura sem complicar a rotina. Posso te mostrar em 2 minutos?</p>
          <div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => onAction('Mensagem selecionada para revisão. Nada foi enviado.')}>Usar para revisar</Button><Button variant="secondary" onClick={() => onAction('Editor aberto no protótipo. Você poderia ajustar o texto antes de copiar.')}>Editar antes de copiar</Button></div>
        </div>
        <div className="rounded-lg border border-navy-600 p-4"><p className="text-small font-extrabold text-white">Por que funciona?</p><ul className="mt-3 grid gap-3 text-small text-slate-400"><li className="flex gap-2"><Check aria-hidden size={16} className="mt-0.5 shrink-0 text-success" />Menciona algo observável.</li><li className="flex gap-2"><Check aria-hidden size={16} className="mt-0.5 shrink-0 text-success" />Faz uma pergunta simples.</li><li className="flex gap-2"><Check aria-hidden size={16} className="mt-0.5 shrink-0 text-success" />Não promete resultado.</li></ul></div>
      </div>
      <Feedback onAction={onAction} />
    </div>
  )
}

function ResponsePanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div>
      <PanelHeading eyebrow="F4.2 · Resposta sugerida" title="A conversa avançou" description="A IA identifica a intenção e sugere o próximo passo, sem responder automaticamente." icon={MessageCircle} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border border-navy-600 bg-navy-800 p-4"><p className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">Mensagem recebida</p><div className="mt-4 rounded-2xl rounded-tl-sm bg-navy-700 px-4 py-3 text-body text-slate-200">Oi! Pode me explicar melhor como funcionaria?</div><span className="mt-3 block text-right text-xs text-slate-500">há 12 min</span></div>
        <div className="rounded-lg border border-violet/30 bg-violet-tint/30 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold tracking-[0.12em] text-violet-300 uppercase">Interesse com dúvida</p><span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Boa hora para avançar</span></div><p className="mt-4 text-body leading-7 text-slate-200">Claro. A ideia é olhar quais anúncios estão trazendo atenção e transformar isso em uma rotina simples de acompanhamento. Para eu te mostrar o exemplo certo: quem hoje cuida dos anúncios do Studio?</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => onAction('Resposta selecionada para revisão. Nada foi enviado.')}>Usar para revisar</Button><span className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-3 text-small font-bold text-cyan"><ChevronRight aria-hidden size={16} />Perguntar quem decide</span></div></div>
      </div>
      <Feedback onAction={onAction} />
    </div>
  )
}

function SummaryPanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div>
      <PanelHeading eyebrow="F4.3 · Resumo da conversa" title="O que já sabemos" description="Uma leitura rápida para você retomar o contexto sem reler tudo." icon={FileText} />
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="rounded-lg border bg-navy-800 p-5"><div className="flex items-center gap-2 text-small font-extrabold text-white"><FileText aria-hidden size={17} className="text-cyan" />Resumo até agora</div><ul className="mt-5 grid gap-4 text-body text-slate-300"><SummaryItem>Lead já anuncia no Instagram.</SummaryItem><SummaryItem>Demonstrou interesse, mas pediu mais contexto.</SummaryItem><SummaryItem>Ainda não há reunião marcada.</SummaryItem></ul></div>
        <div className="rounded-lg border border-cyan/30 bg-cyan-tint/30 p-5"><p className="text-xs font-extrabold tracking-[0.12em] text-cyan uppercase">Próximo passo</p><p className="mt-3 text-ui font-extrabold text-white">Enviar a resposta e perguntar quem decide os anúncios.</p><button type="button" onClick={() => onAction('Próximo passo marcado para revisão.')} className="mt-5 inline-flex items-center gap-2 text-small font-bold text-cyan hover:text-white">Marcar para revisar <ChevronRight aria-hidden size={16} /></button></div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-md border border-warning/20 bg-warning/5 px-4 py-3 text-small text-slate-400"><Lightbulb aria-hidden size={17} className="shrink-0 text-warning" />O resumo separa fatos observados de hipóteses para você não perder o fio.</div>
    </div>
  )
}

function SummaryItem({ children }: { children: string }) {
  return <li className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-cyan" />{children}</li>
}

function AnalysisPanel({ onAction }: { onAction: (message: string) => void }) {
  const [generated, setGenerated] = useState(false)
  return (
    <div>
      <PanelHeading eyebrow="F4.4 · Análise livre" title="Leitura rápida dos anúncios" description="Um rascunho de análise apoiado por contexto e provas salvas." icon={Sparkles} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="rounded-lg border bg-navy-800 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-small font-extrabold text-white">Presença digital do Studio Aurora</p><p className="mt-1 text-xs text-slate-500">Prévia baseada em informações públicas</p></div><span className="rounded-full bg-violet-tint px-2.5 py-1 text-xs font-bold text-violet-300">Rascunho</span></div>{generated ? <div className="mt-5 grid gap-3"><AnalysisMetric label="Presença de anúncio" value="Ativa" detail="Há campanhas visíveis no período." tone="success" /><AnalysisMetric label="Clareza da oferta" value="Boa, com espaço para testar" detail="A mensagem principal aparece logo no primeiro contato." tone="cyan" /><AnalysisMetric label="Próximo teste" value="Pergunta de origem" detail="Descobrir qual anúncio gera mais conversas." tone="violet" /></div> : <div className="mt-5 rounded-md border border-dashed border-navy-600 px-4 py-8 text-center text-small text-slate-400">Clique para gerar uma prévia e visualizar como a análise poderia aparecer.</div>}<div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => { setGenerated(true); onAction('Prévia de análise gerada com dados fictícios.') }}>{generated ? <><RefreshCw aria-hidden size={16} />Gerar novamente</> : <><Sparkles aria-hidden size={16} />Gerar prévia</>}</Button><span className="inline-flex items-center gap-2 text-xs text-slate-500"><ShieldCheck aria-hidden size={15} className="text-success" />Sem promessa garantida</span></div></div>
        <div className="rounded-lg border border-navy-600 p-5"><p className="text-small font-extrabold text-white">Proof Bank</p><p className="mt-2 text-small text-slate-400">Provas que poderiam sustentar a análise.</p><div className="mt-4 grid gap-2"><span className="rounded-md bg-navy-800 px-3 py-2 text-xs font-bold text-slate-300">Case salvo · aprovado</span><span className="rounded-md bg-navy-800 px-3 py-2 text-xs font-bold text-slate-300">Atualizado em 12/10/2026</span><span className="rounded-md bg-navy-800 px-3 py-2 text-xs font-bold text-slate-300">Fonte: contexto do lead</span></div><p className="mt-4 text-xs leading-5 text-slate-500">A IA só deveria usar provas cadastradas e rastreáveis.</p></div>
      </div>
    </div>
  )
}

function AnalysisMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'success' | 'cyan' | 'violet' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'cyan' ? 'text-cyan' : 'text-violet-300'
  return <div className="rounded-md border border-navy-600 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-small font-bold text-slate-400">{label}</p><span className={`text-small font-extrabold ${toneClass}`}>{value}</span></div><p className="mt-2 text-xs text-slate-500">{detail}</p></div>
}

function Feedback({ onAction }: { onAction: (message: string) => void }) {
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-tint pt-4"><span className="text-small text-slate-500">Essa sugestão ajudaria?</span><div className="flex gap-2"><button type="button" onClick={() => onAction('Obrigado. Esse feedback foi registrado no protótipo.')} className="inline-flex h-9 items-center gap-2 rounded-sm border border-navy-600 px-3 text-small font-bold text-slate-300 hover:bg-navy-800"><ThumbsUp aria-hidden size={15} />Sim</button><button type="button" onClick={() => onAction('Feedback recebido. Ajustaríamos a sugestão antes de colocá-la em produção.')} className="inline-flex h-9 items-center gap-2 rounded-sm border border-navy-600 px-3 text-small font-bold text-slate-300 hover:bg-navy-800"><ThumbsDown aria-hidden size={15} />Ainda não</button></div></div>
}

function AsidePanel({ onAction }: { onAction: (message: string) => void }) {
  return <aside className="grid content-start gap-5"><section className="rounded-xl border bg-navy-750 p-5"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-violet-tint text-violet-300"><Bot aria-hidden size={16} /></span><h2 className="text-ui font-extrabold">Como funciona</h2></div><ol className="mt-5 grid gap-4">{['Contexto do lead', 'Sugestão da IA', 'Sua revisão', 'Ação manual'].map((step, index) => <li key={step} className="flex items-center gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? 'bg-cyan text-navy-900' : 'bg-navy-800 text-slate-500'}`}>{index + 1}</span><span className={`text-small font-bold ${index === 0 ? 'text-white' : 'text-slate-500'}`}>{step}</span>{index < 3 && <ChevronRight aria-hidden size={15} className="ml-auto text-slate-600" />}</li>)}</ol></section><section className="rounded-xl border bg-navy-750 p-5"><div className="flex items-center gap-2"><ShieldCheck aria-hidden size={18} className="text-success" /><h2 className="text-ui font-extrabold">Regras da IA</h2></div><ul className="mt-4 grid gap-3 text-small text-slate-400"><li className="flex gap-2"><Check aria-hidden size={15} className="mt-0.5 shrink-0 text-success" />Nunca envia sozinha.</li><li className="flex gap-2"><Check aria-hidden size={15} className="mt-0.5 shrink-0 text-success" />Não inventa números ou depoimentos.</li><li className="flex gap-2"><Check aria-hidden size={15} className="mt-0.5 shrink-0 text-success" />Você pode editar tudo.</li></ul><button type="button" onClick={() => onAction('No produto real, estas regras ficariam sempre visíveis no contexto da sugestão.')} className="mt-5 text-small font-bold text-cyan hover:text-white">Por que isso importa?</button></section></aside>
}
