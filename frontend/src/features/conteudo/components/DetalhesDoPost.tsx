import { useState } from 'react'
import { CalendarClock, ChevronLeft, Clapperboard, CopyPlus, ChevronRight, ExternalLink, Image as ImageIcon, Layers, LoaderCircle, RotateCw, Send, Trash2 } from 'lucide-react'
import { SeletorDeDataEHora } from '@/components/ui/seletor-de-data-hora'
import { InstagramIcon } from '@/brand/icons'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { cancelarPost, publicarAgora, remarcarPost } from '../api'
import { dataDoPost, estaPendente, SITUACOES_DO_POST } from '../situacoes'
import type { Post } from '../tipos'
import { formatarDuracao } from '../video'
import { VisualizadorDoPost } from './VisualizadorDoPost'

type Props = {
  post: Post | null
  /** Os posts do período, na ordem do calendário, para o "2 de 3". */
  lista: Post[]
  onIrPara: (post: Post) => void
  onFechar: () => void
  /** O servidor devolveu o post (publicado agora ou tentando de novo). */
  onAtualizado: (post: Post) => void
  onCancelado: (id: string) => void
  /** Rascunho agendado: sai da faixa de rascunhos e entra no calendário. */
  onAgendado: (post: Post) => void
  /** Abre o "Novo post" com a legenda e as imagens deste. */
  onDuplicar: (post: Post) => void
}

/** Painel lateral com o post: a arte grande, os dados, as ações e o anterior/próximo do período. */
export function DetalhesDoPost({ post, lista, onIrPara, onFechar, onAtualizado, onCancelado, onAgendado, onDuplicar }: Props) {
  const indice = post ? lista.findIndex((p) => p.id === post.id) : -1
  return (
    <Sheet open={post !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 font-marca sm:max-w-xl">
        <header className="flex items-center gap-3 border-b border-border px-6 py-4 pr-14">
          <SheetTitle className="m-0 flex-1 text-lg font-extrabold tracking-[-0.02em] text-foreground">Detalhes do post</SheetTitle>
          {indice >= 0 && lista.length > 1 && (
            <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted-foreground">
              <button type="button" aria-label="Post anterior" disabled={indice === 0} onClick={() => onIrPara(lista[indice - 1])} className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent disabled:opacity-30">
                <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
              {indice + 1} de {lista.length}
              <button type="button" aria-label="Próximo post" disabled={indice === lista.length - 1} onClick={() => onIrPara(lista[indice + 1])} className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent disabled:opacity-30">
                <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </span>
          )}
        </header>
        {post && <Conteudo key={post.id} post={post} onAtualizado={onAtualizado} onCancelado={onCancelado} onAgendado={onAgendado} onDuplicar={onDuplicar} />}
      </SheetContent>
    </Sheet>
  )
}

/** Hashtags da legenda viram etiquetas; o texto fica sem elas. */
function separarHashtags(legenda: string) {
  const hashtags = [...new Set(legenda.match(/#[\p{L}\p{N}_]+/gu) ?? [])]
  const texto = legenda.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { texto, hashtags }
}

/** Título do post: a primeira frase da legenda (sem hashtags), até 90 letras. */
function tituloDoPost(texto: string) {
  const primeira = texto.split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? ''
  return primeira.length > 90 ? `${primeira.slice(0, 87).trimEnd()}…` : primeira
}

/** "sex., 9 out · 13h" ou "sex., 9 out · 13h30" */
function quando(iso: string) {
  const data = new Date(iso)
  const dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.(?=\s|$)/g, '').replace(/ de /g, ' ')
  const minutos = data.getMinutes()
  return `${dia} · ${data.getHours()}h${minutos ? String(minutos).padStart(2, '0') : ''}`
}

const rotuloDeSecao = 'm-0 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground'

function Conteudo({ post, onAtualizado, onCancelado, onAgendado, onDuplicar }: Pick<Props, 'onAtualizado' | 'onCancelado' | 'onAgendado' | 'onDuplicar'> & { post: Post }) {
  const situacao = SITUACOES_DO_POST[post.status]
  const { texto, hashtags } = separarHashtags(post.caption)
  const titulo = tituloDoPost(texto)
  const linhas: [string, React.ReactNode][] = [
    [
      'Situação',
      <span key="s" className={cn('inline-flex items-center gap-2 font-semibold', situacao.cor)}>
        <span aria-hidden className={cn('h-2 w-2 rounded-full', situacao.barra)} />
        {situacao.rotulo}
      </span>,
    ],
    [
      'Rede',
      <span key="r" className="inline-flex items-center gap-2">
        <InstagramIcon aria-hidden size={18} className="text-leadnexi-violet-texto" />
        Instagram
      </span>,
    ],
    [
      post.status === 'PUBLISHED' ? 'Publicado' : 'Quando',
      <span key="q" className="inline-flex items-center gap-2 first-letter:uppercase">
        <CalendarClock aria-hidden className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        <span className="first-letter:uppercase">{post.status === 'DRAFT' ? 'Sem data (rascunho)' : quando(dataDoPost(post))}</span>
      </span>,
    ],
    [
      'Formato',
      <span key="f" className="inline-flex items-center gap-2">
        {post.images[0]?.kind === 'VIDEO' ? (
          <Clapperboard aria-hidden className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        ) : post.images.length > 1 ? (
          <Layers aria-hidden className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        ) : (
          <ImageIcon aria-hidden className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        )}
        {post.images[0]?.kind === 'VIDEO'
          ? `Reel${post.images[0].durationMs ? ` · ${formatarDuracao(post.images[0].durationMs)}` : ''}`
          : post.images.length > 1
            ? `Carrossel · ${post.images.length} imagens`
            : 'Foto'}
      </span>,
    ],
  ]

  return (
    <>
      {/* Os blocos não encolhem para caber: a arte aparece inteira e o painel rola */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 [&>*]:shrink-0">
        <VisualizadorDoPost imagens={post.images} />
        {titulo && <h3 className="m-0 text-base font-extrabold leading-snug text-foreground">{titulo}</h3>}
        {post.status === 'FAILED' && post.error && (
          <p className="m-0 rounded-lg border border-leadnexi-danger/40 px-3 py-2 text-[13px] font-medium text-leadnexi-danger">{post.error}</p>
        )}
        {post.status === 'REMOVED' && <p className="m-0 text-[13px] text-muted-foreground">Não está mais no seu perfil (apagado ou arquivado).</p>}

        <dl className="m-0 overflow-hidden rounded-xl border border-border bg-card">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
              <dt className="font-medium text-muted-foreground">{rotulo}</dt>
              <dd className="m-0 font-semibold text-foreground">{valor}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="legenda" className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 id="legenda" className={rotuloDeSecao}>
            Legenda
          </h3>
          <p className="m-0 text-[13px] font-semibold text-muted-foreground">Instagram</p>
          <SheetDescription asChild>
            <p className={cn('m-0 whitespace-pre-wrap text-sm leading-6', texto ? 'text-foreground' : 'text-muted-foreground')}>{texto || 'Sem legenda'}</p>
          </SheetDescription>
          {hashtags.length > 0 && (
            <ul className="m-0 flex flex-wrap gap-1.5 p-0" aria-label="Hashtags">
              {hashtags.map((tag) => (
                <li key={tag} className="list-none rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {post.status === 'DRAFT' ? (
        <AcoesDoRascunho post={post} onCancelado={onCancelado} onAgendado={onAgendado} />
      ) : (
        <Acoes post={post} onAtualizado={onAtualizado} onCancelado={onCancelado} onDuplicar={onDuplicar} />
      )}
    </>
  )
}

/**
 * Rodapé: enquanto não saiu, "Cancelar post" e "Publicar agora" (ou "Tentar de novo"), cada um
 * confirma com um segundo clique; publicado, "Ver no Instagram"; removido, "Tirar da lista".
 */
function Acoes({ post, onAtualizado, onCancelado, onDuplicar }: Pick<Props, 'onAtualizado' | 'onCancelado' | 'onDuplicar'> & { post: Post }) {
  const [confirmando, setConfirmando] = useState<'cancelar' | 'publicar' | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const pendente = estaPendente(post)

  const agir = async (acao: 'cancelar' | 'publicar') => {
    if (confirmando !== acao) return setConfirmando(acao)
    setConfirmando(null)
    setOcupado(true)
    try {
      if (acao === 'cancelar') {
        await cancelarPost(post.id)
        onCancelado(post.id)
        addToast('success', post.status === 'REMOVED' ? 'Tirado da lista' : 'Post cancelado')
      } else {
        onAtualizado(await publicarAgora(post.id))
      }
    } catch (e) {
      const motivo = e instanceof ErroDeApi && (e.status === 409 || e.status === 404) ? e.message : 'Tente de novo.'
      addToast('error', acao === 'cancelar' ? 'Não foi possível cancelar' : 'Não foi possível publicar', motivo)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <footer className="grid grid-cols-2 gap-3 border-t border-border px-6 py-4">
      {(pendente || post.status === 'REMOVED') && (
        <Button
          variant="outline"
          className={cn(botaoSecundarioDoTopo, 'h-11', confirmando === 'cancelar' && 'border-leadnexi-danger/60 text-leadnexi-danger hover:text-leadnexi-danger')}
          disabled={ocupado}
          onClick={() => void agir('cancelar')}
          onBlur={() => setConfirmando(null)}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {confirmando === 'cancelar' ? 'Confirmar' : post.status === 'REMOVED' ? 'Tirar da lista' : 'Cancelar post'}
        </Button>
      )}
      {pendente && (
        <Button className={cn(botaoPrincipalDoTopo, 'h-11')} disabled={ocupado} onClick={() => void agir('publicar')} onBlur={() => setConfirmando(null)}>
          {ocupado ? (
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          ) : post.status === 'FAILED' ? (
            <RotateCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Send aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          )}
          {confirmando === 'publicar' ? 'Confirmar' : post.status === 'FAILED' ? 'Tentar de novo' : 'Publicar agora'}
        </Button>
      )}
      {post.status === 'PUBLISHED' && post.permalink && (
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(botaoSecundarioDoTopo, 'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm no-underline hover:bg-accent')}
        >
          <ExternalLink aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Ver no Instagram
        </a>
      )}
      {/* Duplicar vale para qualquer post: ao lado do "Ver no Instagram", ou numa linha só embaixo */}
      <Button
        variant="outline"
        className={cn(botaoSecundarioDoTopo, 'h-11', !(post.status === 'PUBLISHED' && post.permalink) && 'col-span-2')}
        disabled={ocupado}
        onClick={() => onDuplicar(post)}
      >
        <CopyPlus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Duplicar
      </Button>
    </footer>
  )
}

/** "2026-10-02T09:00" no horário local, para o seletor de data e hora. */
function paraCampo(data: Date) {
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`
}

/**
 * Rodapé do rascunho: "Apagar rascunho" (confirma com um segundo clique) e "Agendar", que abre o
 * seletor de dia e hora (amanhã às 9h já vem marcado) e confirma no "Agendar para…".
 */
function AcoesDoRascunho({ post, onCancelado, onAgendado }: Pick<Props, 'onCancelado' | 'onAgendado'> & { post: Post }) {
  const [quando, setQuando] = useState<string | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [minimo] = useState(() => paraCampo(new Date()))

  const abrirAgenda = () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(9, 0, 0, 0)
    setQuando(paraCampo(amanha))
  }

  const agendar = async () => {
    if (!quando) return
    if (quando < minimo) return addToast('error', 'Esse horário já passou', 'Escolha um horário no futuro.')
    setOcupado(true)
    try {
      onAgendado(await remarcarPost(post.id, new Date(quando).toISOString()))
    } catch (e) {
      addToast('error', 'Não foi possível agendar', e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Tente de novo.')
      setOcupado(false)
    }
  }

  const apagar = async () => {
    if (!confirmandoApagar) return setConfirmandoApagar(true)
    setOcupado(true)
    try {
      await cancelarPost(post.id)
      onCancelado(post.id)
      addToast('success', 'Rascunho apagado')
    } catch {
      addToast('error', 'Não foi possível apagar', 'Tente de novo.')
      setOcupado(false)
    }
  }

  return (
    <footer className="flex flex-col gap-3 border-t border-border px-6 py-4">
      {quando !== null && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-[13px] font-semibold text-muted-foreground">Quando publicar</span>
          <SeletorDeDataEHora valor={quando} minimo={minimo} onChange={setQuando} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className={cn(botaoSecundarioDoTopo, 'h-11', confirmandoApagar && 'border-leadnexi-danger/60 text-leadnexi-danger hover:text-leadnexi-danger')}
          disabled={ocupado}
          onClick={() => void apagar()}
          onBlur={() => setConfirmandoApagar(false)}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {confirmandoApagar ? 'Confirmar' : 'Apagar rascunho'}
        </Button>
        <Button className={cn(botaoPrincipalDoTopo, 'h-11')} disabled={ocupado} onClick={() => (quando === null ? abrirAgenda() : void agendar())}>
          {ocupado ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <CalendarClock aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          {quando === null ? 'Agendar' : 'Confirmar agendamento'}
        </Button>
      </div>
    </footer>
  )
}
