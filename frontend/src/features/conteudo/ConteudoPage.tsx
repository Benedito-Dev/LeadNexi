import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Images, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { InstagramIcon } from '@/brand/icons'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { Button } from '@/components/ui/button'
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
import { diasVisiveis, somarDias, type Modo } from './datas'
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
  const [novo, setNovo] = useState<{ base: Post | null } | null>(null)
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
          <>
            <Button className={botaoPrincipalDoTopo} onClick={() => setNovo({ base: null })}>
              <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
              Novo post
            </Button>
            {automatica !== null && (
              <span className="hidden items-center gap-2 text-[13px] font-semibold text-muted-foreground lg:inline-flex" title="Se os agendados saem sozinhos na hora marcada">
                <span aria-hidden className={cn('h-2 w-2 rounded-full', automatica ? 'bg-success-foreground' : 'bg-warn-foreground')} />
                {automatica ? 'Publicação automática ligada' : 'Publicação automática desligada'}
              </span>
            )}
            <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Visão">
              {VISOES.map(([valor, rotulo]) => (
                <button key={valor} type="button" role="tab" aria-selected={visao === valor} onClick={() => setVisao(valor)} className={segmento(visao === valor)}>
                  {rotulo}
                </button>
              ))}
            </div>
          </>
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
        <CalendarioDePosts modo={modo} ancora={ancora} onAncora={setAncora} dias={dias} posts={posts} onAbrir={(post) => setAbertoId(post.id)} onRemarcado={trocar} />
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
      <NovoPost aberto={novo !== null} conectado={conta?.connected === true && !conta.account.needsReconnect} base={novo?.base ?? null} onFechar={() => setNovo(null)} onCriado={criado} />
    </div>
  )
}
