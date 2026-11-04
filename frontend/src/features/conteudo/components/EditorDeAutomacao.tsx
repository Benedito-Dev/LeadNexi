import { useEffect, useState } from 'react'
import { Check, CircleAlert, Clapperboard, ImageOff, Layers, LoaderCircle, Save, Trash2 } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Input } from '@/components/ui/input'
import { segmento, barraDeSegmentos } from '@/components/ui/segmentos'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatarDecorrido } from '../../hoje/textos'
import { buscarPerfil } from '../../instagram/api'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import type { PostDoPerfil } from '../../instagram/tipos'
import { Interruptor } from '@/components/ui/interruptor'
import {
  apagarAutomacao,
  criarAutomacao,
  editarAutomacao,
  LIMITE_COM_BOTAO,
  LIMITE_DA_MENSAGEM,
  LIMITE_DO_BOTAO,
  listarDisparos,
  TEXTO_PADRAO_DE_SEGUIR,
  type Automacao,
  type Disparo,
} from '../automacoes'
import { Passo } from './NovoPost'

type Props = {
  aberto: boolean
  /** Editando esta; null = nova */
  automacao: Automacao | null
  onFechar: () => void
  onSalvo: () => void
}

/** Nova automação ou edição: painel à direita com o post, a palavra, a mensagem e a resposta pública. */
export function EditorDeAutomacao({ aberto, automacao, onFechar, onSalvo }: Props) {
  return (
    <Sheet open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 font-marca sm:max-w-xl">
        <header className="border-b border-border px-6 py-4 pr-14">
          <SheetTitle className="m-0 text-lg font-extrabold tracking-[-0.02em] text-foreground">{automacao ? 'Editar automação' : 'Nova automação'}</SheetTitle>
          <SheetDescription className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">Comentou no post, recebe a mensagem no direct.</SheetDescription>
        </header>
        {aberto && <Formulario key={automacao?.id ?? 'nova'} automacao={automacao} onFechar={onFechar} onSalvo={onSalvo} />}
      </SheetContent>
    </Sheet>
  )
}

/** "quero, link ,  Quero" → ["quero", "link"] */
function separar(texto: string, separador: RegExp) {
  const vistos = new Set<string>()
  return texto
    .split(separador)
    .map((parte) => parte.trim())
    .filter((parte) => {
      const chave = parte.toLowerCase()
      if (!parte || vistos.has(chave)) return false
      vistos.add(chave)
      return true
    })
}

function Formulario({ automacao, onFechar, onSalvo }: Omit<Props, 'aberto'>) {
  const [nome, setNome] = useState(automacao?.name ?? '')
  const [todosOsPosts, setTodosOsPosts] = useState(automacao ? automacao.mediaIds.length === 0 : false)
  const [posts, setPosts] = useState<string[]>(automacao?.mediaIds ?? [])
  const [qualquerComentario, setQualquerComentario] = useState(automacao ? automacao.keywords.length === 0 : false)
  const [palavras, setPalavras] = useState(automacao?.keywords.join(', ') ?? '')
  const [mensagem, setMensagem] = useState(automacao?.message ?? '')
  const [respostas, setRespostas] = useState(automacao?.publicReplies.join('\n') ?? '')
  const [comBotao, setComBotao] = useState(Boolean(automacao?.buttonLabel))
  const [botao, setBotao] = useState(automacao?.buttonLabel ?? 'Quero receber')
  const [entrega, setEntrega] = useState(automacao?.deliveryMessage ?? '')
  const [pedirParaSeguir, setPedirParaSeguir] = useState(automacao?.requireFollow ?? false)
  const [textoDeSeguir, setTextoDeSeguir] = useState(automacao?.notFollowingMessage ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)

  const listaDePalavras = separar(palavras, /,/)
  const limite = comBotao ? LIMITE_COM_BOTAO : LIMITE_DA_MENSAGEM
  const bloqueio = !nome.trim()
    ? 'Dê um nome para achar a automação na lista.'
    : !todosOsPosts && posts.length === 0
      ? 'Escolha pelo menos um post, ou "Qualquer post".'
      : !qualquerComentario && listaDePalavras.length === 0
        ? 'Escreva pelo menos uma palavra, ou "Qualquer comentário".'
        : !mensagem.trim()
          ? 'Escreva a mensagem do direct.'
          : mensagem.length > limite
            ? `A mensagem passa de ${limite} caracteres${comBotao ? ' (o limite com botão)' : ''}.`
            : comBotao && !botao.trim()
              ? 'Escreva o texto do botão.'
              : comBotao && !entrega.trim()
                ? 'Escreva o que chega quando a pessoa tocar no botão.'
                : null

  const salvar = async () => {
    if (bloqueio) return
    setSalvando(true)
    setErro(null)
    const dados = {
      name: nome.trim(),
      mediaIds: todosOsPosts ? [] : posts,
      keywords: qualquerComentario ? [] : listaDePalavras,
      message: mensagem.trim(),
      publicReplies: separar(respostas, /\n/),
      buttonLabel: comBotao ? botao.trim() : null,
      deliveryMessage: comBotao ? entrega.trim() : null,
      requireFollow: comBotao && pedirParaSeguir,
      notFollowingMessage: comBotao && pedirParaSeguir ? textoDeSeguir.trim() || null : null,
    }
    try {
      if (automacao) await editarAutomacao(automacao.id, dados)
      else await criarAutomacao(dados)
      addToast('success', automacao ? 'Automação salva' : 'Automação ligada', automacao ? undefined : 'Já responde os próximos comentários.')
      onSalvo()
    } catch (e) {
      setErro(e instanceof ErroDeApi ? e.message : 'Não foi possível salvar. Tente de novo.')
      setSalvando(false)
    }
  }

  const apagar = async () => {
    if (!automacao) return
    if (!confirmandoApagar) return setConfirmandoApagar(true)
    setSalvando(true)
    try {
      await apagarAutomacao(automacao.id)
      addToast('success', 'Automação apagada')
      onSalvo()
    } catch (e) {
      setErro(e instanceof ErroDeApi ? e.message : 'Não foi possível apagar. Tente de novo.')
      setSalvando(false)
      setConfirmandoApagar(false)
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        {/* 1. Nome */}
        <section aria-labelledby="au-nome" className="flex flex-col gap-3">
          <Passo id="au-nome" numero={1} titulo="Nome" />
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Link do catálogo" aria-labelledby="au-nome" />
        </section>

        {/* 2. Em qual post */}
        <section aria-labelledby="au-post" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo id="au-post" numero={2} titulo="Em qual post" detalhe={!todosOsPosts && posts.length > 0 ? `${posts.length} ${posts.length === 1 ? 'escolhido' : 'escolhidos'}` : undefined} />
          <div className={barraDeSegmentos} role="radiogroup" aria-label="Em qual post">
            <button type="button" role="radio" aria-checked={!todosOsPosts} onClick={() => setTodosOsPosts(false)} className={segmento(!todosOsPosts)}>
              Posts escolhidos
            </button>
            <button type="button" role="radio" aria-checked={todosOsPosts} onClick={() => setTodosOsPosts(true)} className={segmento(todosOsPosts)}>
              Qualquer post
            </button>
          </div>
          {todosOsPosts ? (
            <p className="m-0 text-[13px] font-medium text-muted-foreground">Vale para todos os posts e Reels, inclusive os que você publicar depois.</p>
          ) : (
            <GradeDePosts escolhidos={posts} onMudar={setPosts} />
          )}
        </section>

        {/* 3. Qual comentário */}
        <section aria-labelledby="au-palavra" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo id="au-palavra" numero={3} titulo="Qual comentário" />
          <div className={barraDeSegmentos} role="radiogroup" aria-label="Qual comentário">
            <button type="button" role="radio" aria-checked={!qualquerComentario} onClick={() => setQualquerComentario(false)} className={segmento(!qualquerComentario)}>
              Com a palavra
            </button>
            <button type="button" role="radio" aria-checked={qualquerComentario} onClick={() => setQualquerComentario(true)} className={segmento(qualquerComentario)}>
              Qualquer comentário
            </button>
          </div>
          {!qualquerComentario && (
            <>
              <Input value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="quero, link, preço" aria-label="Palavras que disparam" />
              <p className="m-0 text-xs font-medium text-muted-foreground">Separe por vírgula. Maiúscula e acento não fazem diferença: "quero" também pega "QUERO!".</p>
            </>
          )}
        </section>

        {/* 4. Mensagem */}
        <section aria-labelledby="au-mensagem" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo id="au-mensagem" numero={4} titulo="Mensagem no direct" detalhe={`${mensagem.length}/${limite}`} alerta={mensagem.length > limite} />
          <div className={barraDeSegmentos} role="radiogroup" aria-label="Formato da mensagem">
            <button type="button" role="radio" aria-checked={!comBotao} onClick={() => setComBotao(false)} className={segmento(!comBotao)}>
              Só a mensagem
            </button>
            <button type="button" role="radio" aria-checked={comBotao} onClick={() => setComBotao(true)} className={segmento(comBotao)}>
              Com botão
            </button>
          </div>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={4}
            placeholder={comBotao ? 'Oi! Toque no botão aqui embaixo que eu te mando o link.' : 'Oi! Aqui está o link que você pediu: https://...'}
            className="min-h-24 resize-y text-sm leading-6 [field-sizing:content] max-h-80"
            aria-labelledby="au-mensagem"
            aria-invalid={mensagem.length > limite}
          />
          {comBotao && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4">
              <Campo id="au-botao" rotulo="Texto do botão" dica={`Até ${LIMITE_DO_BOTAO} caracteres.`}>
                <Input id="au-botao" value={botao} onChange={(e) => setBotao(e.target.value)} maxLength={LIMITE_DO_BOTAO} placeholder="Quero receber" />
              </Campo>
              <Campo id="au-entrega" rotulo="O que chega quando tocar">
                <Textarea
                  id="au-entrega"
                  value={entrega}
                  onChange={(e) => setEntrega(e.target.value)}
                  rows={3}
                  placeholder="Aqui está: https://..."
                  className="min-h-20 resize-y text-sm leading-6 [field-sizing:content] max-h-60"
                  maxLength={LIMITE_DA_MENSAGEM}
                />
              </Campo>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-semibold text-foreground">Só para quem me segue</p>
                  <p className="m-0 mt-0.5 text-xs font-medium text-muted-foreground">Quem não segue recebe um pedido para seguir e o botão de novo.</p>
                </div>
                <Interruptor ligado={pedirParaSeguir} rotulo="Só para quem me segue" onMudar={setPedirParaSeguir} />
              </div>
              {pedirParaSeguir && (
                <Textarea
                  value={textoDeSeguir}
                  onChange={(e) => setTextoDeSeguir(e.target.value)}
                  rows={2}
                  placeholder={TEXTO_PADRAO_DE_SEGUIR}
                  aria-label="Mensagem para quem não segue"
                  className="min-h-16 resize-y text-sm leading-6 [field-sizing:content] max-h-40"
                  maxLength={LIMITE_DA_MENSAGEM}
                />
              )}
            </div>
          )}
          <p className="m-0 text-xs font-medium text-muted-foreground">Cada pessoa recebe uma vez por post, mesmo se comentar de novo.</p>
        </section>

        {/* 5. Resposta pública */}
        <section aria-labelledby="au-publica" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo id="au-publica" numero={5} titulo="Responder no comentário" detalhe="opcional" />
          <Textarea
            value={respostas}
            onChange={(e) => setRespostas(e.target.value)}
            rows={3}
            placeholder={'Te mandei no direct!\nCorre no direct que mandei lá'}
            className="min-h-20 resize-y text-sm leading-6 [field-sizing:content] max-h-60"
            aria-labelledby="au-publica"
          />
          <p className="m-0 text-xs font-medium text-muted-foreground">Uma resposta por linha. O LeadNexi sorteia uma a cada comentário, para não repetir sempre a mesma.</p>
        </section>

        {automacao && <UltimosDisparos automacaoId={automacao.id} comBotao={Boolean(automacao.buttonLabel)} />}
      </div>

      <footer className="flex flex-col gap-3 border-t border-border px-6 py-4">
        {bloqueio && <p className="m-0 text-[13px] font-medium text-warn-foreground">{bloqueio}</p>}
        {erro && <MensagemDeErro texto={erro} />}
        <div className="flex gap-3">
          {automacao && (
            <Button
              variant="outline"
              className={cn(botaoSecundarioDoTopo, 'h-11', confirmandoApagar && 'border-leadnexi-danger/60 text-leadnexi-danger hover:text-leadnexi-danger')}
              onClick={() => void apagar()}
              disabled={salvando}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {confirmandoApagar ? 'Confirmar' : 'Apagar'}
            </Button>
          )}
          <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11 flex-1')} onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button className={cn(botaoPrincipalDoTopo, 'h-11 flex-1')} onClick={() => void salvar()} disabled={Boolean(bloqueio) || salvando}>
            {salvando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
            {automacao ? 'Salvar' : 'Ligar automação'}
          </Button>
        </div>
      </footer>
    </>
  )
}

/** Os últimos posts do perfil (lidos na hora na Meta) para marcar onde a automação vale. */
function GradeDePosts({ escolhidos, onMudar }: { escolhidos: string[]; onMudar: (ids: string[]) => void }) {
  const [media, setMedia] = useState<PostDoPerfil[] | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    buscarPerfil()
      .then((perfil) => (perfil.connected ? setMedia(perfil.profile.media) : setFalhou(true)))
      .catch(() => setFalhou(true))
  }, [])

  if (falhou) return <MensagemDeErro texto='Não foi possível ler os posts do perfil. Confira a conexão do Instagram ou use "Qualquer post".' />
  if (!media)
    return (
      <div aria-busy="true" aria-label="Carregando posts" className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  if (media.length === 0) return <p className="m-0 text-[13px] font-medium text-muted-foreground">O perfil ainda não tem posts. Use "Qualquer post".</p>

  // Escolhidos que não estão mais entre os últimos posts continuam valendo
  const fora = escolhidos.filter((id) => !media.some((m) => m.id === id)).length
  const alternar = (id: string) => onMudar(escolhidos.includes(id) ? escolhidos.filter((e) => e !== id) : [...escolhidos, id])

  return (
    <>
      <ul className="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
        {media.map((post) => {
          const marcado = escolhidos.includes(post.id)
          return (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => alternar(post.id)}
                aria-pressed={marcado}
                aria-label={`Post de ${post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : 'data desconhecida'}`}
                className={cn(
                  'relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-muted outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-leadnexi-cyan',
                  marcado && 'ring-2 ring-leadnexi-violet',
                )}
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" loading="lazy" className={cn('h-full w-full object-cover transition-opacity', marcado ? 'opacity-100' : 'opacity-80 hover:opacity-100')} />
                ) : (
                  <ImageOff aria-hidden className="m-auto h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                )}
                {(post.type === 'VIDEO' || post.type === 'CAROUSEL_ALBUM') && (
                  <span aria-hidden className="absolute right-1 top-1 text-white drop-shadow">
                    {post.type === 'VIDEO' ? <Clapperboard className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  </span>
                )}
                {marcado && (
                  <span aria-hidden className="absolute bottom-1 left-1 grid h-5 w-5 place-items-center rounded-full bg-leadnexi-violet-600 text-leadnexi-on-accent">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {fora > 0 && <p className="m-0 text-xs font-medium text-muted-foreground">+ {fora} {fora === 1 ? 'post mais antigo escolhido antes' : 'posts mais antigos escolhidos antes'}.</p>}
    </>
  )
}

const SITUACAO: Record<Disparo['status'], string> = {
  PENDING: 'Enviando',
  SENT: 'Enviada',
  SKIPPED: 'Já tinha recebido',
  FAILED: 'Falhou',
}

/** Quem comentou e se a mensagem saiu, do mais novo para o mais antigo. */
function UltimosDisparos({ automacaoId, comBotao }: { automacaoId: string; comBotao: boolean }) {
  const [disparos, setDisparos] = useState<Disparo[] | null>(null)

  useEffect(() => {
    listarDisparos(automacaoId)
      .then(setDisparos)
      .catch(() => setDisparos([]))
  }, [automacaoId])

  return (
    <section aria-labelledby="au-disparos" className="flex flex-col gap-3 border-t border-border pt-5">
      <h3 id="au-disparos" className="m-0 text-[15px] font-extrabold text-foreground">
        Últimos comentários
      </h3>
      {!disparos ? (
        <div aria-busy="true" className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : disparos.length === 0 ? (
        <p className="m-0 text-[13px] font-medium text-muted-foreground">Ninguém comentou ainda.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {disparos.map((d) => (
            <li key={d.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-bold text-foreground">
                  {d.username ? `@${d.username}` : 'Alguém'} <span className="font-medium text-muted-foreground">comentou "{d.commentText}"</span>
                </p>
                {d.error && (
                  <p className="m-0 mt-0.5 flex items-start gap-1 text-xs font-medium text-warn-foreground">
                    <CircleAlert aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {d.error}
                  </p>
                )}
              </div>
              <span className={cn('shrink-0 text-xs font-semibold', d.status === 'FAILED' ? 'text-leadnexi-danger' : d.status === 'SENT' ? 'text-success-foreground' : 'text-muted-foreground')}>
                {d.status === 'SENT' && comBotao ? (d.deliveredAt ? 'Tocou e recebeu' : 'Esperando o toque') : SITUACAO[d.status]} · {formatarDecorrido(d.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
