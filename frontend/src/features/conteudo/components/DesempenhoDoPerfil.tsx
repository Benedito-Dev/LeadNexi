import { useEffect, useState } from 'react'
import { Clapperboard, CircleAlert, ExternalLink, Eye, Heart, ImageOff, KeyRound, Layers, Radar, Users } from 'lucide-react'
import { Link } from 'react-router'
import { CartaoDeNumero } from '@/components/ui/cartao-de-numero'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { Selo } from '@/components/ui/selo'
import { cn } from '@/lib/utils'
import { buscarDesempenho } from '../api'
import type { Desempenho, NumeroDoPeriodo, PostComNumeros } from '../tipos'

type Dias = 7 | 30
type Ordem = 'recentes' | 'vistos' | 'interacoes'

const ORDENS: [Ordem, string][] = [
  ['recentes', 'Recentes'],
  ['vistos', 'Mais vistos'],
  ['interacoes', 'Interações'],
]

const inteiro = new Intl.NumberFormat('pt-BR')
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const cartao = 'rounded-xl border border-border bg-card p-5'

const formatar = (valor: number | null) => (valor === null ? '—' : inteiro.format(valor))
/** Mudança sobre o período anterior; sem base para comparar, nada */
const variacao = ({ current, previous }: NumeroDoPeriodo) => (current === null || !previous ? null : (current - previous) / previous)

/**
 * Desempenho: como o perfil do Instagram está indo nos últimos 7 ou 30 dias (comparando com o
 * período anterior) e os números de cada post recente, lidos na hora na Meta.
 */
export function DesempenhoDoPerfil() {
  const [dias, setDias] = useState<Dias>(7)
  // Guardado por período: voltar para um já visto não espera de novo
  const [respostas, setRespostas] = useState<Partial<Record<Dias, Desempenho>>>({})
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const resposta = respostas[dias] ?? null

  useEffect(() => {
    if (respostas[dias]) return
    buscarDesempenho(dias)
      .then((r) => setRespostas((atual) => ({ ...atual, [dias]: r })))
      .catch(() => setRespostas((atual) => ({ ...atual, [dias]: { status: 'falha' } })))
  }, [dias, respostas])

  const anteriores = `${dias} dias anteriores`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-extrabold text-foreground">Desempenho do perfil</h2>
          <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">
            Últimos {dias} dias, comparados com os {anteriores}.
          </p>
        </div>
        <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Período">
          {([7, 30] as const).map((valor) => (
            <button key={valor} type="button" role="tab" aria-selected={dias === valor} onClick={() => setDias(valor)} className={segmento(dias === valor)}>
              {valor} dias
            </button>
          ))}
        </div>
      </div>

      {!resposta ? (
        <div aria-busy="true" aria-label="Carregando estatísticas" className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : resposta.status === 'sem-permissao' ? (
        <Aviso
          Icone={KeyRound}
          titulo="Falta liberar as estatísticas"
          texto="Desconecte e conecte o Instagram de novo em Configurações › Canais. O Instagram vai pedir a permissão nova, e os números aparecem aqui."
          acao="Ir para Canais"
        />
      ) : resposta.status === 'sem-conta' ? (
        <Aviso Icone={CircleAlert} titulo="Instagram não conectado" texto="Conecte a conta para ver as estatísticas do perfil e dos posts." acao="Conectar agora" />
      ) : resposta.status === 'falha' ? (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-leadnexi-danger/40 bg-card p-5 text-sm font-semibold text-foreground">
          <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
          Não foi possível ler as estatísticas no Instagram. Atualize a página para tentar de novo.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoDeNumero
              Icone={Radar}
              tom="ciano"
              rotulo="Alcance"
              valor={formatar(resposta.account.reach.current)}
              variacao={variacao(resposta.account.reach)}
              detalhe={`Contas que viram seu conteúdo. Antes: ${formatar(resposta.account.reach.previous)}`}
            />
            <CartaoDeNumero
              Icone={Eye}
              tom="violeta"
              rotulo="Visualizações"
              valor={formatar(resposta.account.views.current)}
              variacao={variacao(resposta.account.views)}
              detalhe={`Vezes que posts, Reels e stories foram vistos. Antes: ${formatar(resposta.account.views.previous)}`}
            />
            <CartaoDeNumero
              Icone={Heart}
              tom="violeta"
              rotulo="Interações"
              valor={formatar(resposta.account.total_interactions.current)}
              variacao={variacao(resposta.account.total_interactions)}
              detalhe={`Curtidas, comentários, salvamentos e compartilhamentos. Antes: ${formatar(resposta.account.total_interactions.previous)}`}
            />
            <CartaoDeNumero
              Icone={Users}
              tom="ciano"
              rotulo="Seguidores"
              valor={formatar(resposta.followers)}
              detalhe={textoDeSeguidores(resposta.follows, dias)}
            />
          </div>

          <Extras account={resposta.account} />

          <TabelaDePosts posts={resposta.posts} ordem={ordem} onOrdem={setOrdem} />
        </>
      )}
    </div>
  )
}

function textoDeSeguidores(follows: Extract<Desempenho, { status: 'ok' }>['follows'], dias: Dias) {
  if (!follows || follows.follows === null) return `Total de hoje. A Meta só informa ganhos e perdas para perfis com 100 seguidores ou mais.`
  const perdidos = follows.unfollows ?? 0
  return `+${inteiro.format(follows.follows)} novos e −${inteiro.format(perdidos)} que saíram nos últimos ${dias} dias`
}

/** Números menores da conta, numa linha; só os que a Meta informou. */
function Extras({ account }: { account: Extract<Desempenho, { status: 'ok' }>['account'] }) {
  const itens = (
    [
      ['Contas engajadas', account.accounts_engaged],
      ['Visitas ao perfil', account.profile_views],
      ['Cliques no link da bio', account.website_clicks],
    ] as const
  ).filter(([, numero]) => numero.current !== null)
  if (itens.length === 0) return null
  return (
    <dl className={cn(cartao, 'm-0 grid gap-4 py-4 sm:grid-cols-3')}>
      {itens.map(([rotulo, numero]) => {
        const mudanca = variacao(numero)
        return (
          <div key={rotulo} className="flex items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-1">
            <dt className="text-[13px] font-semibold text-muted-foreground">{rotulo}</dt>
            <dd className="m-0 flex items-baseline gap-2">
              <span className="text-xl font-extrabold tabular-nums text-foreground">{formatar(numero.current)}</span>
              {mudanca !== null && Math.round(mudanca * 100) !== 0 && (
                <span className={cn('text-xs font-bold tabular-nums', mudanca > 0 ? 'text-success-foreground' : 'text-leadnexi-danger')}>
                  {mudanca > 0 ? '+' : ''}
                  {Math.round(mudanca * 100)}%
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

const ordenar = (posts: PostComNumeros[], ordem: Ordem) => {
  if (ordem === 'recentes') return posts
  const valor = (p: PostComNumeros) => (ordem === 'vistos' ? p.views : p.interactions) ?? -1
  return [...posts].sort((a, b) => valor(b) - valor(a))
}

/** Os últimos posts do perfil com os números de cada um; a barra mostra quem foi mais visto. */
function TabelaDePosts({ posts, ordem, onOrdem }: { posts: PostComNumeros[]; ordem: Ordem; onOrdem: (o: Ordem) => void }) {
  const maisVisto = Math.max(1, ...posts.map((p) => p.views ?? 0))
  const lista = ordenar(posts, ordem)
  return (
    <section aria-labelledby="posts-do-perfil" className={cartao}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="posts-do-perfil" className="m-0 text-base font-extrabold text-foreground">
            Posts
          </h2>
          <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">Os {posts.length} mais recentes do perfil, com os números desde que saíram.</p>
        </div>
        <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Ordem dos posts">
          {ORDENS.map(([valor, rotulo]) => (
            <button key={valor} type="button" role="tab" aria-selected={ordem === valor} onClick={() => onOrdem(valor)} className={segmento(ordem === valor)}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="mb-0 mt-4 text-sm font-medium text-muted-foreground">Nenhum post no perfil ainda.</p>
      ) : (
        <>
        {/* No celular, um cartão por post; a tabela entra a partir do tablet */}
        <ul className="m-0 mt-4 flex list-none flex-col p-0 md:hidden">
          {lista.map((post) => (
            <CartaoDoPost key={post.id} post={post} />
          ))}
        </ul>
        <div className="-mx-5 mt-4 hidden overflow-x-auto px-5 md:block">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Post</th>
                <th className="w-40 py-2 pr-3 font-semibold">Visualizações</th>
                <th className="py-2 pr-3 text-right font-semibold">Alcance</th>
                <th className="py-2 pr-3 text-right font-semibold">Curtidas</th>
                <th className="py-2 pr-3 text-right font-semibold">Comentários</th>
                <th className="py-2 pr-3 text-right font-semibold">Salvos</th>
                <th className="py-2 pr-3 text-right font-semibold">Compart.</th>
                <th className="w-8 py-2" aria-label="Abrir no Instagram" />
              </tr>
            </thead>
            <tbody>
              {lista.map((post) => (
                <LinhaDoPost key={post.id} post={post} maisVisto={maisVisto} />
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  )
}

/** Miniatura, primeira linha da legenda e "Reel · 27 de out · 6,2 s assistidos em média". */
function ResumoDoPost({ post }: { post: PostComNumeros }) {
  const reel = post.type === 'VIDEO'
  const data = post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : null
  const tipo = reel ? 'Reel' : post.type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Foto'
  const assistido = post.avgWatchMs !== null ? `${(post.avgWatchMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s assistidos em média` : null
  const IconeDoTipo = reel ? Clapperboard : post.type === 'CAROUSEL_ALBUM' ? Layers : null
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
        {post.imageUrl ? (
          <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ImageOff aria-hidden className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        )}
        {IconeDoTipo && <IconeDoTipo aria-hidden className="absolute right-1 top-1 h-3.5 w-3.5 text-white" strokeWidth={1.75} />}
      </span>
      <div className="min-w-0 md:max-w-[22rem]">
        <p className="m-0 truncate font-semibold text-foreground" title={post.caption ?? undefined}>
          {post.caption?.split('\n')[0] || 'Sem legenda'}
        </p>
        <p className="m-0 mt-0.5 text-xs font-medium text-muted-foreground">{[tipo, data, assistido].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  )
}

function CartaoDoPost({ post }: { post: PostComNumeros }) {
  const numeros: [string, number | null][] = [
    ['Visualiz.', post.views],
    ['Alcance', post.reach],
    ['Curtidas', post.likes],
    ['Coment.', post.comments],
  ]
  return (
    <li className="border-b border-border py-3 text-sm first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ResumoDoPost post={post} />
        </div>
        {post.permalink && <AbrirNoInstagram link={post.permalink} />}
      </div>
      <dl className="m-0 mt-2.5 grid grid-cols-4 gap-2">
        {numeros.map(([rotulo, valor]) => (
          <div key={rotulo} className="min-w-0">
            <dt className="truncate text-[11px] font-semibold text-muted-foreground">{rotulo}</dt>
            <dd className="m-0 font-bold tabular-nums text-foreground">{valor === null ? '—' : compacto.format(valor)}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

function AbrirNoInstagram({ link }: { link: string }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir no Instagram"
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-leadnexi-cyan-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan"
    >
      <ExternalLink aria-hidden className="h-4 w-4" strokeWidth={1.75} />
    </a>
  )
}

function LinhaDoPost({ post, maisVisto }: { post: PostComNumeros; maisVisto: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-3">
        <ResumoDoPost post={post} />
      </td>
      <td className="py-2.5 pr-3">
        <span className="block font-bold tabular-nums text-foreground" title={post.views === null ? undefined : inteiro.format(post.views)}>
          {post.views === null ? '—' : compacto.format(post.views)}
        </span>
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-leadnexi-violet" style={{ width: `${((post.views ?? 0) / maisVisto) * 100}%` }} />
        </span>
      </td>
      <Numero valor={post.reach} />
      <Numero valor={post.likes} />
      <Numero valor={post.comments} />
      <Numero valor={post.saved} />
      <Numero valor={post.shares} />
      <td className="py-2.5 text-right">{post.permalink && <AbrirNoInstagram link={post.permalink} />}</td>
    </tr>
  )
}

function Numero({ valor }: { valor: number | null }) {
  return <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{formatar(valor)}</td>
}

function Aviso({ Icone, titulo, texto, acao }: { Icone: typeof KeyRound; titulo: string; texto: string; acao: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-4 rounded-xl border border-warn-border bg-card p-5">
      <Selo Icone={Icone} tom="ambar" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-foreground">{titulo}</p>
        <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">{texto}</p>
      </div>
      <Link to="/configuracoes/canais" className="text-[13px] font-bold text-leadnexi-cyan-texto no-underline hover:underline">
        {acao}
      </Link>
    </div>
  )
}
