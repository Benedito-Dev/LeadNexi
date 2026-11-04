import { useEffect, useState } from 'react'
import { CircleAlert, KeyRound, MessageCircleReply, Plus, Workflow } from 'lucide-react'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Selo } from '@/components/ui/selo'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatarDecorrido } from '../../hoje/textos'
import type { SituacaoDaConta } from '../../instagram/tipos'
import { editarAutomacao, listarAutomacoes, type Automacao } from '../automacoes'
import { Aviso } from './DesempenhoDoPerfil'
import { EditorDeAutomacao } from './EditorDeAutomacao'

/**
 * Conteúdo › Automações: quem comenta num post recebe uma mensagem no direct, sozinho, e vira
 * lead. Lista das automações (ligar, pausar, quantas mensagens já saíram) e o editor.
 */
export function AutomacoesDoInstagram({ conta }: { conta: SituacaoDaConta | null }) {
  const [automacoes, setAutomacoes] = useState<Automacao[] | null>(null)
  const [erro, setErro] = useState(false)
  // Editor aberto: nova (null) ou editando uma
  const [aberta, setAberta] = useState<{ automacao: Automacao | null } | null>(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    listarAutomacoes()
      .then((lista) => {
        setAutomacoes(lista)
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [recarga])

  const ligar = async (automacao: Automacao, active: boolean) => {
    setAutomacoes((lista) => lista && lista.map((a) => (a.id === automacao.id ? { ...a, active } : a)))
    try {
      await editarAutomacao(automacao.id, { active })
    } catch {
      setAutomacoes((lista) => lista && lista.map((a) => (a.id === automacao.id ? { ...a, active: !active } : a)))
      addToast('error', active ? 'Não foi possível ligar' : 'Não foi possível pausar', 'Tente de novo.')
    }
  }

  // Sem os avisos de comentários, nada dispara: conexão antiga (sem a permissão) ou sem conta
  const semComentarios = conta?.connected === true && !conta.account.needsReconnect && !conta.account.commentsEnabled
  const semConta = conta !== null && (!conta.connected || conta.account.needsReconnect)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 min-w-0 flex-1 text-sm font-medium text-muted-foreground">
          Quem comenta no post recebe sua mensagem no direct na hora e entra no CRM como lead.
        </p>
        <Button className={cn(botaoPrincipalDoTopo, 'h-10')} onClick={() => setAberta({ automacao: null })}>
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
          Nova automação
        </Button>
      </div>

      {semConta ? (
        <Aviso Icone={CircleAlert} titulo="Instagram não conectado" texto="As automações só disparam com a conta conectada." acao="Conectar agora" />
      ) : semComentarios ? (
        <Aviso
          Icone={KeyRound}
          titulo="Falta liberar os comentários"
          texto="Desconecte e conecte o Instagram de novo em Configurações › Canais. O Instagram vai pedir a permissão de comentários, e as automações passam a disparar."
          acao="Ir para Canais"
        />
      ) : null}

      {erro ? (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-leadnexi-danger/40 bg-card p-5 text-sm font-semibold text-foreground">
          <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
          Não foi possível carregar as automações. Atualize a página para tentar de novo.
        </p>
      ) : !automacoes ? (
        <div aria-busy="true" aria-label="Carregando automações" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : automacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <Selo Icone={Workflow} tom="violeta" />
          <p className="m-0 text-[15px] font-extrabold text-foreground">Nenhuma automação ainda</p>
          <p className="m-0 max-w-md text-[13px] font-medium text-muted-foreground">
            Exemplo: quem comentar "quero" no seu Reel recebe o link no direct, sem você precisar responder um por um.
          </p>
          <Button className={cn(botaoPrincipalDoTopo, 'mt-1 h-10')} onClick={() => setAberta({ automacao: null })}>
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
            Criar a primeira
          </Button>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {automacoes.map((automacao) => (
            <li key={automacao.id}>
              <CartaoDaAutomacao automacao={automacao} onAbrir={() => setAberta({ automacao })} onLigar={(ativa) => void ligar(automacao, ativa)} />
            </li>
          ))}
        </ul>
      )}

      <EditorDeAutomacao
        aberto={aberta !== null}
        automacao={aberta?.automacao ?? null}
        onFechar={() => setAberta(null)}
        onSalvo={() => {
          setAberta(null)
          setRecarga((n) => n + 1)
        }}
      />
    </div>
  )
}

/** Gatilho em uma linha: "Em 2 posts · comentários com "quero" ou "link"" */
function resumoDoGatilho(automacao: Pick<Automacao, 'mediaIds' | 'keywords'>) {
  const onde = automacao.mediaIds.length === 0 ? 'Qualquer post' : automacao.mediaIds.length === 1 ? 'Em 1 post' : `Em ${automacao.mediaIds.length} posts`
  const quais = automacao.keywords.length === 0 ? 'qualquer comentário' : `comentários com ${automacao.keywords.map((k) => `"${k}"`).join(' ou ')}`
  return `${onde} · ${quais}`
}

function CartaoDaAutomacao({ automacao, onAbrir, onLigar }: { automacao: Automacao; onAbrir: () => void; onLigar: (ativa: boolean) => void }) {
  return (
    <article className={cn('flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors', !automacao.active && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <Selo Icone={MessageCircleReply} tom={automacao.active ? 'violeta' : 'ambar'} />
        <button type="button" onClick={onAbrir} className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan">
          <h3 className="m-0 truncate text-[15px] font-extrabold text-foreground">{automacao.name}</h3>
          <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">{resumoDoGatilho(automacao)}</p>
        </button>
        <Interruptor ligado={automacao.active} rotulo={automacao.active ? `Pausar ${automacao.name}` : `Ligar ${automacao.name}`} onMudar={onLigar} />
      </div>
      <p className="m-0 line-clamp-2 rounded-lg bg-muted/60 px-3 py-2 text-[13px] font-medium text-foreground">{automacao.message}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
        <span>
          <span className="font-marca text-sm font-extrabold tabular-nums text-foreground">{automacao.sent}</span> {automacao.sent === 1 ? 'mensagem enviada' : 'mensagens enviadas'}
        </span>
        {automacao.lastSentAt && <span>última há {formatarDecorrido(automacao.lastSentAt)}</span>}
        {automacao.failed > 0 && (
          <span className="inline-flex items-center gap-1 text-warn-foreground">
            <CircleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {automacao.failed} {automacao.failed === 1 ? 'falhou' : 'falharam'}
          </span>
        )}
        <span className="ml-auto">{automacao.active ? 'Ligada' : 'Pausada'}</span>
      </div>
    </article>
  )
}

/** Chave liga/desliga (violeta ligada). */
export function Interruptor({ ligado, rotulo, onMudar }: { ligado: boolean; rotulo: string; onMudar: (ligado: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan focus-visible:ring-offset-2',
        ligado ? 'border-leadnexi-violet-600 bg-leadnexi-violet-600' : 'border-input bg-muted',
      )}
    >
      <span aria-hidden className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', ligado ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}
