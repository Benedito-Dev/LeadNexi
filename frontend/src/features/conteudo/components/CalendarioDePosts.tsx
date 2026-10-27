import { useEffect, useMemo, useRef, useState } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { ChevronLeft, ChevronRight, Layers, Plus } from 'lucide-react'
import { botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { remarcarPost } from '../api'
import { chaveDoDia, somarDias, type Modo } from '../datas'
import { dataDoPost, estaPendente, ORDEM_DAS_SITUACOES, SITUACOES_DO_POST } from '../situacoes'
import type { Post } from '../tipos'

/** Remarcar para menos de 1 minuto à frente não dá tempo de publicar. */
const jaPassou = (data: Date) => data.getTime() < Date.now() + 60_000

const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Plural do rótulo da situação no resumo ("2 agendados", "1 removido do Instagram"). */
const RESUMO: Record<string, [string, string]> = {
  PUBLISHED: ['publicado', 'publicados'],
  SCHEDULED: ['agendado', 'agendados'],
  PUBLISHING: ['publicando', 'publicando'],
  FAILED: ['com falha', 'com falha'],
  REMOVED: ['removido', 'removidos'],
}

type Props = {
  modo: Modo
  ancora: Date
  onAncora: (ancora: Date) => void
  dias: Date[]
  posts: Post[] | null
  onAbrir: (post: Post) => void
  /** O servidor devolveu o post remarcado. */
  onRemarcado: (post: Post) => void
  /** "+" num dia livre de hoje em diante: abre o "Novo post" com o dia marcado. */
  onCriarNoDia: (dia: Date) => void
}

/**
 * Parede de criativos (mês ou semana): o dia com post mostra a ARTE ocupando o quadrado inteiro,
 * com o número do dia num selo por cima e um filete na base por post, na cor da situação. Dia
 * livre fica tracejado. Agendado ou com falha arrasta para outro dia (mantém o horário).
 */
export function CalendarioDePosts({ modo, ancora, onAncora, dias, posts, onAbrir, onRemarcado, onCriarNoDia }: Props) {
  const [hoje] = useState(() => chaveDoDia(new Date()))

  const porDia = useMemo(() => {
    const mapa = new Map<string, Post[]>()
    for (const post of posts ?? []) {
      const chave = chaveDoDia(new Date(dataDoPost(post)))
      mapa.set(chave, [...(mapa.get(chave) ?? []), post])
    }
    for (const lista of mapa.values()) lista.sort((a, b) => dataDoPost(a).localeCompare(dataDoPost(b)))
    return mapa
  }, [posts])

  // Resumo e legenda contados da MESMA lista que a grade desenha (nunca divergem)
  const doPeriodo = dias.filter((d) => modo === 'semana' || d.getMonth() === ancora.getMonth())
  const postsDoPeriodo = doPeriodo.flatMap((d) => porDia.get(chaveDoDia(d)) ?? [])
  const diasLivres = doPeriodo.filter((d) => !porDia.has(chaveDoDia(d))).length
  const contagem = ORDEM_DAS_SITUACOES.map((situacao) => ({ situacao, total: postsDoPeriodo.filter((p) => p.status === situacao).length })).filter((c) => c.total > 0)
  const resumo = [
    ...contagem.map(({ situacao, total }) => `${total} ${RESUMO[situacao][total === 1 ? 0 : 1]}`),
    `${diasLivres} ${diasLivres === 1 ? 'dia livre' : 'dias livres'}`,
  ].join(' · ')

  const titulo =
    modo === 'mes'
      ? ancora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : `${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  const andar = (direcao: -1 | 1) =>
    onAncora(modo === 'semana' ? somarDias(ancora, 7 * direcao) : new Date(ancora.getFullYear(), ancora.getMonth() + direcao, 1))

  // Soltou um post num dia: mesmo horário, no dia de destino
  const remarcar = async (postId: string, dia: Date) => {
    const post = posts?.find((p) => p.id === postId)
    if (!post || chaveDoDia(new Date(post.scheduledAt)) === chaveDoDia(dia)) return
    const atual = new Date(post.scheduledAt)
    const novo = new Date(dia)
    novo.setHours(atual.getHours(), atual.getMinutes(), 0, 0)
    if (jaPassou(novo)) {
      addToast('error', 'Esse horário já passou', 'Escolha um dia à frente.')
      return
    }
    try {
      onRemarcado(await remarcarPost(post.id, novo.toISOString()))
      addToast('success', 'Post remarcado', novo.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }))
    } catch (e) {
      addToast('error', 'Não foi possível remarcar', e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Tente de novo.')
    }
  }

  return (
    <section aria-label="Calendário de posts" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em] text-foreground first-letter:uppercase" aria-live="polite">
          {titulo}
        </h2>
        {posts && <p className="m-0 text-sm font-medium text-muted-foreground">{resumo}</p>}
        <div className="ml-auto flex items-center gap-1.5 self-center">
          <Button variant="outline" size="sm" className={botaoSecundarioDoTopo} onClick={() => onAncora(new Date())}>
            Hoje
          </Button>
          <BotaoSeta rotulo={modo === 'semana' ? 'Semana anterior' : 'Mês anterior'} onClick={() => andar(-1)}>
            <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </BotaoSeta>
          <BotaoSeta rotulo={modo === 'semana' ? 'Próxima semana' : 'Próximo mês'} onClick={() => andar(1)}>
            <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </BotaoSeta>
        </div>
      </div>

      {/* O que cada filete quer dizer: só as situações presentes, mais o dia livre */}
      <ul aria-label="O que cada marca quer dizer" className="m-0 flex flex-wrap items-center gap-x-5 gap-y-2 p-0 text-xs font-medium text-muted-foreground">
        {contagem.map(({ situacao }) => (
          <li key={situacao} className="flex list-none items-center gap-2">
            <span aria-hidden className={cn('h-1 w-4 rounded-full', SITUACOES_DO_POST[situacao].barra)} />
            {SITUACOES_DO_POST[situacao].rotulo}
          </li>
        ))}
        <li className="flex list-none items-center gap-2">
          <span aria-hidden className="w-4 border-t border-dashed border-muted-foreground/60" />
          Dia livre
        </li>
      </ul>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5" aria-busy={posts === null}>
        {DIAS_DA_SEMANA.map((dia) => (
          <span key={dia} aria-hidden className="pb-0.5 text-center text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            {dia}
          </span>
        ))}
        {dias.map((dia) =>
          modo === 'mes' && dia.getMonth() !== ancora.getMonth() ? (
            <span key={chaveDoDia(dia)} aria-hidden className="aspect-square p-2 text-xs tabular-nums text-muted-foreground/50">
              {dia.getDate()}
            </span>
          ) : (
            <QuadradoDoDia
              key={chaveDoDia(dia)}
              dia={dia}
              posts={porDia.get(chaveDoDia(dia)) ?? []}
              hoje={hoje}
              formato={modo === 'semana' ? 'aspect-[4/5]' : 'aspect-square'}
              carregando={posts === null}
              onAbrir={onAbrir}
              onSoltar={(postId) => void remarcar(postId, dia)}
              onCriar={() => onCriarNoDia(dia)}
            />
          ),
        )}
      </div>
      <p className="m-0 text-xs font-medium text-muted-foreground">Arraste um post agendado para outro dia: ele mantém o horário.</p>
    </section>
  )
}

function BotaoSeta({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline" size="icon" aria-label={rotulo} title={rotulo} onClick={onClick} className="h-8 w-8">
      {children}
    </Button>
  )
}

/**
 * Um dia da parede. Com 1 post, a arte ocupa o quadrado; com 2, as duas dividem ao meio; com 3+,
 * a primeira fica com metade e a outra metade mostra "+N". Um filete por post na base.
 */
function QuadradoDoDia({
  dia,
  posts,
  hoje,
  formato,
  carregando,
  onAbrir,
  onSoltar,
  onCriar,
}: {
  dia: Date
  posts: Post[]
  hoje: string
  formato: string
  carregando: boolean
  onAbrir: (post: Post) => void
  onSoltar: (postId: string) => void
  onCriar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [emCima, setEmCima] = useState(false)
  const chave = chaveDoDia(dia)
  const passado = chave < hoje
  const ehHoje = chave === hoje

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'post' && !passado,
      onDragEnter: () => setEmCima(true),
      onDragLeave: () => setEmCima(false),
      onDrop: ({ source }) => {
        setEmCima(false)
        onSoltar(String(source.data.postId))
      },
    })
  }, [passado, onSoltar])

  return (
    <div
      ref={ref}
      aria-label={dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      className={cn(
        'relative overflow-hidden rounded-xl transition-shadow',
        formato,
        posts.length === 0 ? 'border border-dashed border-border' : 'border border-border bg-muted/40 shadow-sm',
        ehHoje && 'border-2 border-leadnexi-violet',
        carregando && 'animate-pulse bg-muted/40',
        emCima && 'ring-2 ring-leadnexi-cyan ring-offset-2 ring-offset-card',
      )}
    >
      {/* Dia livre de hoje em diante: o quadrado todo cria um post nesse dia */}
      {posts.length === 0 && !passado && !carregando && (
        <button
          type="button"
          onClick={onCriar}
          aria-label={`Novo post em ${dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          className="group absolute inset-0 grid place-items-center rounded-xl text-muted-foreground/50 transition-colors hover:bg-leadnexi-violet/5 hover:text-leadnexi-violet-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-current transition-transform group-hover:scale-110">
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
          </span>
        </button>
      )}
      {posts.length > 0 && (
        <div className="absolute inset-0 flex">
          <Arte post={posts[0]} dividida={posts.length > 1} onAbrir={onAbrir} />
          {posts.length === 2 && <Arte post={posts[1]} dividida onAbrir={onAbrir} />}
          {posts.length > 2 && <span className="grid flex-1 place-items-center border-l-2 border-card bg-muted text-sm font-bold text-muted-foreground">+{posts.length - 1}</span>}
        </div>
      )}
      {/* O número do dia, num selo por cima da arte */}
      <span
        aria-hidden
        className={cn(
          'absolute left-1.5 top-1.5 z-10 grid h-6 min-w-6 place-items-center rounded-lg px-1.5 text-xs font-semibold tabular-nums',
          posts.length > 0 ? 'bg-background/85 text-foreground backdrop-blur-sm' : passado ? 'text-muted-foreground/60' : 'text-muted-foreground',
          ehHoje && 'bg-leadnexi-violet-600 text-leadnexi-on-accent',
        )}
      >
        {dia.getDate()}
      </span>
      {posts.length > 0 && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 flex h-1">
          {posts.map((post) => (
            <span key={post.id} className={cn('h-full flex-1', SITUACOES_DO_POST[post.status].barra)} />
          ))}
        </span>
      )}
    </div>
  )
}

/** A arte de um post dentro do dia (inteira ou metade): clicar abre, arrastar remarca. */
function Arte({ post, dividida, onAbrir }: { post: Post; dividida: boolean; onAbrir: (post: Post) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const movel = estaPendente(post)
  const situacao = SITUACOES_DO_POST[post.status]
  const hora = new Date(dataDoPost(post)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const capa = post.images[0]

  useEffect(() => {
    const el = ref.current
    if (!el || !movel) return
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'post', postId: post.id }),
      onDragStart: () => setArrastando(true),
      onDrop: () => setArrastando(false),
    })
  }, [post.id, movel])

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onAbrir(post)}
      aria-label={`${situacao.rotulo} às ${hora}: ${post.caption || 'sem legenda'}`}
      title={`${situacao.rotulo} · ${hora}`}
      className={cn(
        'group relative h-full min-w-0 flex-1 overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-leadnexi-cyan',
        dividida && 'border-l-2 border-card first:border-l-0',
        movel ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        arrastando && 'opacity-40',
      )}
    >
      {capa ? (
        <img src={capa.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <span className="absolute inset-0 flex items-end bg-muted p-2 pb-3">
          <span className="line-clamp-3 text-xs leading-snug text-muted-foreground">{post.caption}</span>
        </span>
      )}
      {!dividida && post.images.length > 1 && (
        <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white" title={`Carrossel com ${post.images.length} imagens`}>
          <Layers aria-hidden className="h-3 w-3" strokeWidth={2} />
          {post.images.length}
        </span>
      )}
      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
    </button>
  )
}
