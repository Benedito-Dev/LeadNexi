import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRightLeft,
  Bot,
  CalendarClock,
  FileText,
  History,
  ImageIcon,
  KeyRound,
  LoaderCircle,
  MessageCircle,
  MessageSquareText,
  PencilLine,
  Plus,
  Reply,
  Sparkles,
  StickyNote,
  TerminalSquare,
  TriangleAlert,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatarDataHora } from '../crm/datas'
import { formatarDecorrido, formatarDiaEHora } from '../hoje/textos'
import { useStatusDaIA } from '../ia/useStatusDaIA'
import { CampoCopiar, MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import {
  criarSenhaDoClaude,
  listarAcoesDoClaude,
  listarSenhasDoClaude,
  revogarSenhaDoClaude,
  type AcaoDoClaude,
  type SenhaDoClaude,
} from './api'
import { CampoComIcone, SecaoDeConfiguracao } from './SecaoDeConfiguracao'

/** Endereço do servidor MCP: o mesmo domínio do app (o /api vai para o backend). */
const enderecoDoMcp = () => `${window.location.origin}/api/mcp`

const comandoDoClaudeCode = (token: string) =>
  `claude mcp add --transport http leadnexi ${enderecoDoMcp()} --header "Authorization: Bearer ${token}"`

/** Pílula de situação: bolinha + texto, no tom do sinal. */
function Situacao({ tom, children }: { tom: 'ok' | 'alerta' | 'neutro'; children: string }) {
  const cores = {
    ok: 'border-success-foreground/30 bg-success-foreground/10 text-success-foreground',
    alerta: 'border-warn-foreground/30 bg-warn-foreground/10 text-warn-foreground',
    neutro: 'border-border bg-muted text-muted-foreground',
  }
  const pontos = { ok: 'bg-success-foreground', alerta: 'bg-warn-foreground', neutro: 'bg-muted-foreground' }
  return (
    <span className={cn('inline-flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-bold', cores[tom])}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', pontos[tom])} />
      {children}
    </span>
  )
}

/** Configurações › IA e Claude: a IA dentro do app e o acesso do Claude Code (MCP). */
export function IaPage() {
  return (
    // Três assuntos diferentes, três cartões separados (no Perfil, um cartão só: é tudo sobre você)
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card">
        <SecaoDeConfiguracao Icone={Sparkles} titulo="IA dentro do app" texto="Os botões de IA das telas. Ela só sugere: nada é enviado sozinho.">
          <IaDoApp />
        </SecaoDeConfiguracao>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <SecaoDeConfiguracao Icone={TerminalSquare} titulo="Claude Code" texto="Deixa o Claude consultar seus leads e agir por você. Ele nunca envia mensagem.">
          <AcessoDoClaude />
        </SecaoDeConfiguracao>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <SecaoDeConfiguracao Icone={History} titulo="Últimas ações do Claude" texto="Também fica no histórico de cada lead, marcado como via Claude.">
          <AcoesDoClaude />
        </SecaoDeConfiguracao>
      </div>
    </div>
  )
}

const RECURSOS_DA_IA: { Icone: LucideIcon; rotulo: string; onde: string }[] = [
  { Icone: MessageSquareText, rotulo: 'Gerar mensagem', onde: 'Hoje' },
  { Icone: Reply, rotulo: 'Sugerir resposta', onde: 'Conversas' },
  { Icone: FileText, rotulo: 'Resumir o lead', onde: 'Ficha' },
  { Icone: ImageIcon, rotulo: 'Escrever legenda', onde: 'Conteúdo' },
]

function IaDoApp() {
  const status = useStatusDaIA()
  const ligada = status?.configured === true
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {status === null ? (
          <Situacao tom="neutro">Conferindo…</Situacao>
        ) : ligada ? (
          <>
            <Situacao tom="ok">Ligada</Situacao>
            <span className="font-mono text-xs font-semibold text-muted-foreground">{status.model}</span>
          </>
        ) : (
          <Situacao tom="alerta">Desligada</Situacao>
        )}
      </div>
      {status !== null && !ligada && (
        <p className="m-0 flex items-start gap-2 rounded-lg border border-warn-foreground/25 bg-warn-foreground/5 px-3 py-2.5 text-[13px] font-medium text-foreground">
          <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0 text-warn-foreground" strokeWidth={1.75} />
          <span>
            Falta a chave da Anthropic no servidor. Coloque em <code className="rounded bg-muted px-1 font-mono text-xs">ANTHROPIC_API_KEY</code> e os botões acendem.
          </span>
        </p>
      )}
      <ul className="m-0 grid gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-4">
        {RECURSOS_DA_IA.map(({ Icone, rotulo, onde }) => (
          <li key={rotulo} className={cn('flex list-none items-center gap-3 rounded-xl border border-border p-3', !ligada && 'opacity-60')}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-leadnexi-violet/15 text-leadnexi-violet-texto">
              <Icone aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{rotulo}</span>
              <span className="block text-xs font-medium text-muted-foreground">em {onde}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Senhas de acesso do Claude Code: criar (o token aparece uma vez), ver o uso e revogar. */
function AcessoDoClaude() {
  const [senhas, setSenhas] = useState<SenhaDoClaude[] | null>(null)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)
  const [nome, setNome] = useState('Claude Code')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criada, setCriada] = useState<{ nome: string; token: string } | null>(null)

  const carregar = useCallback(() => {
    listarSenhasDoClaude()
      .then((lista) => {
        setSenhas(lista)
        setErroAoCarregar(false)
      })
      .catch(() => setErroAoCarregar(true))
  }, [])

  useEffect(carregar, [carregar])

  const criar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!nome.trim()) return
    setCriando(true)
    setErro(null)
    try {
      const nova = await criarSenhaDoClaude(nome.trim())
      setCriada({ nome: nova.name, token: nova.token })
      carregar()
    } catch (e) {
      setErro(e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Não foi possível criar a senha. Tente de novo.')
    } finally {
      setCriando(false)
    }
  }

  const ativas = senhas?.filter((s) => !s.revokedAt).length ?? 0

  return (
    <div className="flex flex-col gap-5">
      <CampoCopiar id="mcp-endereco" rotulo="Endereço do servidor" valor={enderecoDoMcp()} dica="O Claude Code se conecta aqui." />

      {criada ? (
        <div className="flex flex-col gap-3 rounded-xl border border-leadnexi-violet/40 bg-leadnexi-violet/5 p-4">
          <p className="m-0 flex items-start gap-2 text-[13px] font-semibold text-warn-foreground">
            <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
            Copie agora: a senha "{criada.nome}" não aparece de novo.
          </p>
          <CampoCopiar
            id="mcp-comando"
            rotulo="Comando para o terminal"
            valor={comandoDoClaudeCode(criada.token)}
            dica="Cole no terminal, na pasta onde você usa o Claude Code, e abra uma sessão nova."
          />
          <Button type="button" className={cn(botaoPrincipalDoTopo, 'self-start')} onClick={() => setCriada(null)}>
            Já copiei
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void criar(e)} className="flex flex-col gap-1.5">
          <label htmlFor="mcp-nome" className="text-sm font-medium text-foreground">
            Nova senha de acesso
          </label>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-48 flex-1">
              <CampoComIcone Icone={KeyRound} id="mcp-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Claude Code no notebook" />
            </div>
            <Button type="submit" className={cn(botaoPrincipalDoTopo, 'h-11 px-5')} disabled={criando || !nome.trim()}>
              {criando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />}
              Criar senha
            </Button>
          </div>
        </form>
      )}
      {erro && <MensagemDeErro texto={erro} />}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Senhas criadas</span>
          {senhas !== null && <span className="text-xs font-semibold tabular-nums text-muted-foreground">{ativas === 1 ? '1 ativa' : `${ativas} ativas`}</span>}
        </div>
        {erroAoCarregar ? (
          <MensagemDeErro texto="Não foi possível carregar as senhas. Atualize a página para tentar de novo." />
        ) : senhas === null ? (
          <div aria-busy="true" aria-label="Carregando senhas" className="h-16 animate-pulse rounded-xl bg-muted/60" />
        ) : senhas.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhuma senha ainda: o Claude não tem acesso.</p>
        ) : (
          <ul className="m-0 flex flex-col divide-y divide-border rounded-xl border border-border p-0">
            {senhas.map((senha) => (
              <LinhaDaSenha key={senha.id} senha={senha} onRevogada={carregar} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Uma senha: nome, quando foi criada e usada, a situação e "Revogar" (pede um segundo clique). */
function LinhaDaSenha({ senha, onRevogada }: { senha: SenhaDoClaude; onRevogada: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [revogando, setRevogando] = useState(false)
  const revogada = Boolean(senha.revokedAt)

  const revogar = async () => {
    setRevogando(true)
    try {
      await revogarSenhaDoClaude(senha.id)
      addToast('success', 'Senha revogada', `"${senha.name}" não acessa mais o LeadNexi.`)
      onRevogada()
    } catch {
      addToast('error', 'Não foi possível revogar', 'Tente de novo.')
      setRevogando(false)
    }
  }

  return (
    <li className="flex list-none flex-wrap items-center gap-3 px-4 py-3">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', revogada ? 'bg-muted text-muted-foreground' : 'bg-leadnexi-cyan/15 text-leadnexi-cyan-texto')}>
        <KeyRound aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className={cn('min-w-0 flex-1', revogada && 'opacity-60')}>
        <p className="m-0 truncate text-sm font-bold text-foreground">{senha.name}</p>
        <p className="m-0 mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          Criada em {formatarDataHora(senha.createdAt)} · {senha.lastUsedAt ? `usada há ${formatarDecorrido(senha.lastUsedAt)}` : 'nunca usada'}
        </p>
      </div>
      <Situacao tom={revogada ? 'neutro' : 'ok'}>{revogada ? 'Revogada' : 'Ativa'}</Situacao>
      {!revogada && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={revogando}
          onClick={() => (confirmando ? void revogar() : setConfirmando(true))}
          onBlur={() => setConfirmando(false)}
          className={cn('hover:bg-leadnexi-danger/10 hover:text-leadnexi-danger', confirmando ? 'text-leadnexi-danger' : 'text-muted-foreground')}
        >
          {revogando ? 'Revogando…' : confirmando ? 'Confirmar' : 'Revogar'}
        </Button>
      )}
    </li>
  )
}

/** Ícone e frase de cada tipo de ação (os mesmos tipos do histórico do lead). */
function descreverAcao(acao: AcaoDoClaude): { Icone: LucideIcon; texto: string } {
  switch (acao.type) {
    case 'CREATED':
      return { Icone: UserPlus, texto: 'cadastrou o lead' }
    case 'STAGE_CHANGED':
      return { Icone: ArrowRightLeft, texto: acao.toStage ? `moveu para ${acao.toStage}` : 'mudou de etapa' }
    case 'NOTE':
      return { Icone: StickyNote, texto: acao.text ? `anotou: "${acao.text}"` : 'anotou' }
    case 'FOLLOW_UP_SCHEDULED':
      return { Icone: CalendarClock, texto: acao.dueAt ? `agendou contato para ${formatarDiaEHora(acao.dueAt).toLowerCase()}` : 'agendou contato' }
    case 'WHATSAPP_MESSAGE_RECEIVED':
      return { Icone: MessageCircle, texto: 'registrou a resposta no WhatsApp' }
    case 'LEAD_UPDATED':
      return { Icone: PencilLine, texto: acao.text ? `editou ${acao.text}` : 'editou os dados' }
    default:
      return { Icone: Bot, texto: 'mexeu no lead' }
  }
}

/** As últimas 20 coisas que o Claude fez, numa linha do tempo. */
function AcoesDoClaude() {
  const [acoes, setAcoes] = useState<AcaoDoClaude[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    listarAcoesDoClaude()
      .then(setAcoes)
      .catch(() => setErro(true))
  }, [])

  if (erro) return <MensagemDeErro texto="Não foi possível carregar as ações. Atualize a página para tentar de novo." />
  if (acoes === null) return <div aria-busy="true" aria-label="Carregando ações" className="h-24 animate-pulse rounded-xl bg-muted/60" />
  if (acoes.length === 0) {
    return (
      <p className="m-0 flex items-center gap-2.5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Bot aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />O Claude ainda não fez nada no LeadNexi.
      </p>
    )
  }

  return (
    <ol className="m-0 p-0">
      {acoes.map((acao, i) => {
        const { Icone, texto } = descreverAcao(acao)
        return (
          <li key={acao.id} className="relative flex list-none gap-3 pb-4 last:pb-0">
            {i < acoes.length - 1 && <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-px bg-border" />}
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-leadnexi-violet-texto">
              <Icone aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 pt-1.5">
              <p className="m-0 min-w-0 text-sm font-medium text-foreground">
                <span className="font-bold">{acao.lead.name}</span> <span className="text-muted-foreground">·</span> {texto}
              </p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">há {formatarDecorrido(acao.createdAt)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
