import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Images, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { InstagramIcon } from '@/brand/icons'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { buscarConta } from '../instagram/api'
import type { SituacaoDaConta } from '../instagram/tipos'
import { buscarPublicacao, listarPosts, listarTodosOsPosts, sincronizarPosts, type PostCriado } from './api'
import { CalendarioDePosts } from './components/CalendarioDePosts'
import { DetalhesDoPost } from './components/DetalhesDoPost'
import { FeedDoPerfil } from './components/FeedDoPerfil'
import { NovoPost } from './components/NovoPost'
import { chaveDoDia, diasVisiveis, somarDias, type Modo } from './datas'
import { dataDoPost } from './situacoes'
import type { Post } from './tipos'

type Visao = Modo | 'feed'

const VISOES: [Visao, string][] = [
  ['mes', 'Mês'],
  ['semana', 'Semana'],
  ['feed', 'Feed'],
]

/** Conteúdo: os posts do Instagram no calendário (mês ou semana) ou no feed do perfil, e os detalhes. */
export function ConteudoPage() {
  const [visao, setVisao] = useState<Visao>('mes')
  // O feed não tem período; o calendário guarda o último modo para voltar a ele
  const modo: Modo = visao === 'feed' ? 'mes' : visao
  const [ancora, setAncora] = useState(() => new Date())
  const dias = useMemo(() => diasVisiveis(modo, ancora), [modo, ancora])
  const de = visao === 'feed' ? 'todos' : dias[0].toISOString()
  const ate = visao === 'feed' ? 'todos' : somarDias(dias[dias.length - 1], 1).toISOString()
  // Posts guardados com o período: trocar de semana/mês mostra o carregando até chegar o novo
  const [carregados, setCarregados] = useState<{ periodo: string; posts: Post[] } | null>(null)
  const [erro, setErro] = useState(false)
  const [conta, setConta] = useState<SituacaoDaConta | null>(null)
  const [automatica, setAutomatica] = useState<boolean | null>(null)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  // "Novo post" aberto, vazio (null) ou duplicando um post
  const [novo, setNovo] = useState<{ base: Post | null; dia?: string } | null>(null)
  // Muda a cada post criado: recarrega o período
  const [recarga, setRecarga] = useState(0)
  const periodo = `${de}|${ate}`
  const posts = carregados?.periodo === periodo ? carregados.posts : null

  useEffect(() => {
    buscarConta()
      .then((situacao) => {
        setConta(situacao)
        // Confere os publicados com o perfil (apagado lá vira "Removido") só com a conta conectada
        if (situacao.connected) void sincronizarPosts().catch(() => undefined)
      })
      .catch(() => undefined)
    buscarPublicacao()
      .then((p) => setAutomatica(p.automatic))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    ;(de === 'todos' ? listarTodosOsPosts() : listarPosts(de, ate))
      .then((lista) => {
        setCarregados({ periodo: `${de}|${ate}`, posts: lista })
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [de, ate, recarga])

  const trocar = (post: Post) => setCarregados((c) => c && { ...c, posts: c.posts.map((p) => (p.id === post.id ? post : p)) })
  const criado = (post: PostCriado) => {
    setNovo(null)
    setRecarga((n) => n + 1)
    const quando = new Date(post.scheduledAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    if (post.status === 'PUBLISHED') addToast('success', 'Post publicado no Instagram')
    else if (post.status === 'FAILED') addToast('error', 'Post não publicado', post.error ?? 'Abra o post para tentar de novo.', 6000)
    else if (post.alarmFailed) addToast('error', `Post agendado para ${quando}`, 'O despertador da publicação não respondeu: use "Publicar agora" na hora.', 6000)
    else addToast('success', 'Post agendado', quando)
  }
  const tirar = (id: string) => {
    setCarregados((c) => c && { ...c, posts: c.posts.filter((p) => p.id !== id) })
    setAbertoId(null)
  }
  // Ordem do "2 de 3" nos detalhes: a do calendário (mais antigo primeiro) ou a do feed (mais novo primeiro)
  const ordenados = [...(posts ?? [])].sort((a, b) => (visao === 'feed' ? -1 : 1) * dataDoPost(a).localeCompare(dataDoPost(b)))
  const agendados = posts?.filter((p) => p.status === 'SCHEDULED').length ?? 0
  const publicados = posts?.filter((p) => p.status === 'PUBLISHED').length ?? 0

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Conteúdo · LeadNexi</title>
      <ListPageHeader
        icon={Images}
        title="Conteúdo"
        summary={
          posts
            ? `${agendados} ${agendados === 1 ? 'agendado' : 'agendados'} · ${publicados} ${publicados === 1 ? 'publicado' : 'publicados'}${visao === 'feed' ? '' : ' no período'}`
            : 'Posts do Instagram'
        }
        actions={
          // Informação e visão primeiro; a ação principal por último, à direita, separada por um divisor
          <div className="flex flex-wrap items-center gap-3">
            {automatica !== null && (
              <span
                className={cn(
                  'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold lg:inline-flex',
                  automatica ? 'border-success-border bg-success/60 text-success-foreground' : 'border-warn-border bg-warn/60 text-warn-foreground',
                )}
                title={automatica ? 'Os agendados saem sozinhos na hora marcada' : 'Os agendados não saem sozinhos: use "Publicar agora" na hora marcada'}
              >
                <span aria-hidden className="relative flex h-2 w-2">
                  {automatica && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-foreground opacity-60" />}
                  <span className={cn('relative inline-flex h-2 w-2 rounded-full', automatica ? 'bg-success-foreground' : 'bg-warn-foreground')} />
                </span>
                {automatica ? 'Publica sozinho' : 'Publicação manual'}
              </span>
            )}
            <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Visão">
              {VISOES.map(([valor, rotulo]) => (
                <button key={valor} type="button" role="tab" aria-selected={visao === valor} onClick={() => setVisao(valor)} className={segmento(visao === valor)}>
                  {rotulo}
                </button>
              ))}
            </div>
            <span aria-hidden className="mx-1 hidden h-8 w-px bg-border sm:block" />
            <button
              type="button"
              onClick={() => setNovo({ base: null })}
              className="group inline-flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-br from-leadnexi-violet to-leadnexi-violet-600 pl-2 pr-5 text-sm font-bold text-leadnexi-on-accent shadow-[0_6px_20px_-6px_hsl(var(--leadnexi-violet)/0.7)] transition-all hover:-translate-y-px hover:shadow-[0_10px_24px_-6px_hsl(var(--leadnexi-violet)/0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan focus-visible:ring-offset-2"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 transition-transform duration-300 group-hover:rotate-90">
                <Plus aria-hidden className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Novo post
            </button>
          </div>
        }
      />

      {conta && !conta.connected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn-border bg-card px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-leadnexi-violet/15 text-leadnexi-violet-texto">
            <InstagramIcon aria-hidden size={18} />
          </span>
          <p className="m-0 flex-1 text-sm font-semibold text-foreground">
            O Instagram não está conectado. Dá para ver e remarcar os posts, mas eles só saem com a conta conectada.
          </p>
          <Link to="/configuracoes/canais" className="text-[13px] font-bold text-leadnexi-cyan-texto no-underline hover:underline">
            Conectar agora
          </Link>
        </div>
      )}

      {erro && (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-leadnexi-danger/40 bg-card p-4 text-sm font-semibold text-foreground">
          <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
          Não foi possível carregar os posts. Atualize a página para tentar de novo.
        </p>
      )}

      {visao === 'feed' ? (
        <FeedDoPerfil posts={posts} onAbrir={(post) => setAbertoId(post.id)} />
      ) : (
        <CalendarioDePosts modo={modo} ancora={ancora} onAncora={setAncora} dias={dias} posts={posts} onAbrir={(post) => setAbertoId(post.id)}
          onRemarcado={trocar}
          onCriarNoDia={(dia) => setNovo({ base: null, dia: chaveDoDia(dia) })}
        />
      )}

      <DetalhesDoPost
        post={posts?.find((p) => p.id === abertoId) ?? null}
        lista={ordenados}
        onIrPara={(post) => setAbertoId(post.id)}
        onFechar={() => setAbertoId(null)}
        onAtualizado={trocar}
        onCancelado={tirar}
        onDuplicar={(post) => {
          setAbertoId(null)
          setNovo({ base: post })
        }}
      />
      <NovoPost aberto={novo !== null} conectado={conta?.connected === true && !conta.account.needsReconnect} base={novo?.base ?? null} dia={novo?.dia ?? null} onFechar={() => setNovo(null)} onCriado={criado} />
    </div>
  )
}
