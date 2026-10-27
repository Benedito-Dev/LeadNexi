import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Bot, KeyRound, LoaderCircle, Sparkles, TerminalSquare, TriangleAlert } from 'lucide-react'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Selo } from '@/components/ui/selo'
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

const cartao = 'flex gap-4 rounded-xl border border-border bg-card p-6'

/** Endereço do servidor MCP: o mesmo domínio do app (o /api vai para o backend). */
const enderecoDoMcp = () => `${window.location.origin}/api/mcp`

const comandoDoClaudeCode = (token: string) =>
  `claude mcp add --transport http leadnexi ${enderecoDoMcp()} --header "Authorization: Bearer ${token}"`

/** O que o Claude fez, em uma linha (os mesmos tipos do histórico do lead). */
function descreverAcao(acao: AcaoDoClaude): string {
  switch (acao.type) {
    case 'CREATED':
      return 'Cadastrou o lead'
    case 'STAGE_CHANGED':
      return acao.toStage ? `Moveu para ${acao.toStage}` : 'Mudou de etapa'
    case 'NOTE':
      return acao.text ? `Anotou: "${acao.text}"` : 'Anotou'
    case 'FOLLOW_UP_SCHEDULED':
      return acao.dueAt ? `Agendou contato para ${formatarDiaEHora(acao.dueAt).toLowerCase()}` : 'Agendou contato'
    case 'WHATSAPP_MESSAGE_RECEIVED':
      return 'Registrou a resposta no WhatsApp'
    case 'LEAD_UPDATED':
      return acao.text ? `Editou: ${acao.text}` : 'Editou os dados'
    default:
      return 'Mexeu no lead'
  }
}

/** Configurações › IA e Claude: a IA dentro do app e o acesso do Claude Code (MCP). */
export function IaPage() {
  return (
    <div className="flex flex-col gap-4">
      <IaDoApp />
      <AcessoDoClaude />
      <AcoesDoClaude />
    </div>
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

/** A IA que escreve mensagens, respostas, resumos e legendas: ligada ou não, e com qual modelo. */
function IaDoApp() {
  const status = useStatusDaIA()
  return (
    <section aria-labelledby="ia-do-app" className={cartao}>
      <Selo Icone={Sparkles} tom="violeta" />
      <div className="min-w-0 flex-1">
        <Titulo id="ia-do-app" titulo="IA dentro do app" texto="Gerar mensagem, sugerir resposta, resumir o lead e escrever a legenda do post." />
        <p className="mb-0 mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          {status === null ? (
            <span className="text-muted-foreground">Conferindo…</span>
          ) : status.configured ? (
            <>
              <span aria-hidden className="h-2 w-2 rounded-full bg-success-foreground" />
              Ligada · <span className="font-mono text-xs">{status.model}</span>
            </>
          ) : (
            <>
              <span aria-hidden className="h-2 w-2 rounded-full bg-warn-foreground" />
              Desligada: falta a chave da Anthropic (<span className="font-mono text-xs">ANTHROPIC_API_KEY</span>) no servidor
            </>
          )}
        </p>
      </div>
    </section>
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

  const ativas = senhas?.filter((s) => !s.revokedAt) ?? []

  return (
    <section aria-labelledby="acesso-claude" className={cartao}>
      <Selo Icone={TerminalSquare} tom="ciano" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Titulo
          id="acesso-claude"
          titulo="Claude Code (MCP)"
          texto="Deixa o Claude consultar seus leads e agir por você: cadastrar, anotar, mover e agendar. Ele nunca envia mensagem."
        />

        <CampoCopiar id="mcp-endereco" rotulo="Endereço do servidor" valor={enderecoDoMcp()} dica="O Claude Code se conecta aqui." />

        {criada ? (
          <div className="flex flex-col gap-3 rounded-lg border border-leadnexi-violet/40 bg-leadnexi-violet/5 p-4">
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
            <Button type="button" variant="outline" className="self-start" onClick={() => setCriada(null)}>
              Já copiei
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void criar(e)} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-bold text-foreground">
              Nova senha de acesso
              <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Claude Code no notebook" />
            </label>
            <Button type="submit" className={botaoPrincipalDoTopo} disabled={criando || !nome.trim()}>
              {criando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <KeyRound aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
              Criar senha
            </Button>
          </form>
        )}
        {erro && <MensagemDeErro texto={erro} />}

        {erroAoCarregar ? (
          <MensagemDeErro texto="Não foi possível carregar as senhas. Atualize a página para tentar de novo." />
        ) : senhas === null ? (
          <div aria-busy="true" aria-label="Carregando senhas" className="h-16 animate-pulse rounded-lg bg-muted/60" />
        ) : senhas.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">Nenhuma senha ainda: o Claude não tem acesso.</p>
        ) : (
          <ul className="m-0 flex flex-col divide-y divide-border rounded-lg border border-border p-0">
            {senhas.map((senha) => (
              <LinhaDaSenha key={senha.id} senha={senha} onRevogada={carregar} />
            ))}
          </ul>
        )}
        {senhas !== null && senhas.length > 0 && ativas.length === 0 && (
          <p className="m-0 text-[13px] font-medium text-muted-foreground">Todas revogadas: o Claude está sem acesso.</p>
        )}
      </div>
    </section>
  )
}

/** Uma senha: nome, quando foi criada e usada, e "Revogar" (pede um segundo clique). */
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
    <li className={cn('flex list-none flex-wrap items-center gap-3 px-4 py-3', revogada && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-bold text-foreground">{senha.name}</p>
        <p className="m-0 mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          Criada em {formatarDataHora(senha.createdAt)} · {senha.lastUsedAt ? `usada há ${formatarDecorrido(senha.lastUsedAt)}` : 'nunca usada'}
        </p>
      </div>
      {revogada ? (
        <span className="text-xs font-semibold text-muted-foreground">Revogada</span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={revogando}
          onClick={() => (confirmando ? void revogar() : setConfirmando(true))}
          onBlur={() => setConfirmando(false)}
          className={confirmando ? 'text-leadnexi-danger hover:text-leadnexi-danger' : 'text-muted-foreground'}
        >
          {revogando ? 'Revogando…' : confirmando ? 'Confirmar' : 'Revogar'}
        </Button>
      )}
    </li>
  )
}

/** As últimas 20 coisas que o Claude fez (cada uma também está no histórico do lead). */
function AcoesDoClaude() {
  const [acoes, setAcoes] = useState<AcaoDoClaude[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    listarAcoesDoClaude()
      .then(setAcoes)
      .catch(() => setErro(true))
  }, [])

  return (
    <section aria-labelledby="acoes-claude" className={cartao}>
      <Selo Icone={Bot} tom="violeta" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Titulo id="acoes-claude" titulo="Últimas ações do Claude" texto="Tudo também fica no histórico de cada lead, marcado como via Claude." />
        {erro ? (
          <MensagemDeErro texto="Não foi possível carregar as ações. Atualize a página para tentar de novo." />
        ) : acoes === null ? (
          <div aria-busy="true" aria-label="Carregando ações" className="h-16 animate-pulse rounded-lg bg-muted/60" />
        ) : acoes.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">O Claude ainda não fez nada no LeadNexi.</p>
        ) : (
          <ol className="m-0 flex flex-col gap-2.5 p-0">
            {acoes.map((acao) => (
              <li key={acao.id} className="flex list-none items-start gap-2.5">
                <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-leadnexi-violet/60" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    <span className="font-bold">{acao.lead.name}</span> · {descreverAcao(acao)}
                  </span>
                  <span className="block text-xs font-semibold text-muted-foreground">há {formatarDecorrido(acao.createdAt)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
