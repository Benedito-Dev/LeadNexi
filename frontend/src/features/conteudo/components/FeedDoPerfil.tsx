import { useEffect, useState } from 'react'
import {
  BatteryFull,
  ChevronDown,
  CircleAlert,
  Clapperboard,
  Clock3,
  Copy,
  ExternalLink,
  Grid3x3,
  House,
  ImageOff,
  Link2,
  Menu,
  Plus,
  Search,
  Send,
  Signal,
  SquarePlay,
  SquareUser,
  Wifi,
} from 'lucide-react'
import { Link } from 'react-router'
import { FotoRedonda } from '@/components/ui/foto-redonda'
import { cn } from '@/lib/utils'
import { buscarConta, buscarPerfil } from '../../instagram/api'
import type { PerfilDoInstagram, SituacaoDaConta } from '../../instagram/tipos'
import { dataDoPost } from '../situacoes'
import type { Post } from '../tipos'

const numero = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** Um quadro da grade: post do LeadNexi (abre os detalhes) ou post que já está no perfil (abre no Instagram). */
type Quadro = {
  chave: string
  imagem: string | null
  carrossel: boolean
  video: boolean
  /** Agendado ou com falha: ainda não está no perfil */
  marcado?: { quando: string; falhou: boolean }
  post?: Post
  link?: string | null
}

/**
 * O perfil do Instagram como aparece no celular (tema escuro do app), com os números, a bio e a
 * grade de verdade, lidos na hora na Meta. Os agendados do LeadNexi entram no topo da grade, do
 * mais distante para o mais próximo, como o perfil vai ficar quando saírem.
 */
export function FeedDoPerfil({ posts, onAbrir }: { posts: Post[] | null; onAbrir: (post: Post) => void }) {
  const [perfil, setPerfil] = useState<PerfilDoInstagram | null>(null)
  const [conta, setConta] = useState<SituacaoDaConta | null>(null)

  useEffect(() => {
    buscarPerfil()
      .then(setPerfil)
      .catch(() => setPerfil({ connected: false, reason: 'falha' }))
    buscarConta()
      .then(setConta)
      .catch(() => undefined)
  }, [])

  const real = perfil?.connected ? perfil.profile : null
  const contaSalva = conta?.connected ? conta.account : null
  const doLeadNexi = posts ?? []

  const marcados: Quadro[] = doLeadNexi
    .filter((p) => p.status === 'SCHEDULED' || p.status === 'PUBLISHING' || p.status === 'FAILED')
    .sort((a, b) => dataDoPost(b).localeCompare(dataDoPost(a)))
    .map((p) => ({
      chave: p.id,
      imagem: p.images[0]?.url ?? null,
      carrossel: p.images.length > 1,
      video: false,
      marcado: {
        quando: new Date(dataDoPost(p)).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        falhou: p.status === 'FAILED',
      },
      post: p,
    }))

  // Publicados: com a conta conectada, a grade de verdade (inclusive o que saiu direto pelo app);
  // sem conta, os publicados pelo LeadNexi
  const publicados: Quadro[] = real
    ? real.media.map((m) => {
        const doSistema = doLeadNexi.find((p) => p.permalink && p.permalink === m.permalink)
        return { chave: m.id, imagem: m.imageUrl, carrossel: m.type === 'CAROUSEL_ALBUM', video: m.type === 'VIDEO', post: doSistema, link: m.permalink }
      })
    : doLeadNexi
        .filter((p) => p.status === 'PUBLISHED')
        .sort((a, b) => dataDoPost(b).localeCompare(dataDoPost(a)))
        .map((p) => ({ chave: p.id, imagem: p.images[0]?.url ?? null, carrossel: p.images.length > 1, video: false, post: p, link: p.permalink }))

  const usuario = real?.username ?? contaSalva?.username ?? 'seu_perfil'
  const foto = real?.profilePictureUrl ?? contaSalva?.profilePictureUrl ?? null
  const nome = real?.name ?? contaSalva?.name ?? null
  const contadores: [string, number | null][] = [
    ['posts', real?.posts ?? publicados.length],
    ['seguidores', real?.followers ?? null],
    ['seguindo', real?.following ?? null],
  ]

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      {/* O celular */}
      <div className="w-[390px] max-w-full shrink-0 rounded-[48px] border-[10px] border-neutral-800 bg-neutral-950 p-0 shadow-2xl ring-1 ring-black/40">
        <div className="relative flex h-[780px] flex-col overflow-hidden rounded-[38px] bg-black text-neutral-50">
          {/* Barra de status */}
          <div className="flex shrink-0 items-center justify-between px-7 pb-1 pt-3 text-[13px] font-semibold">
            <span className="tabular-nums">9:41</span>
            <span aria-hidden className="absolute left-1/2 top-2.5 h-7 w-28 -translate-x-1/2 rounded-full bg-neutral-950" />
            <span className="flex items-center gap-1.5">
              <Signal aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
              <Wifi aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
              <BatteryFull aria-hidden className="h-4 w-4" strokeWidth={2} />
            </span>
          </div>

          {/* Topo do Instagram */}
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <Plus aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            <span className="flex items-center gap-1 text-base font-bold">
              {usuario}
              <ChevronDown aria-hidden className="h-4 w-4" strokeWidth={2} />
            </span>
            <Menu aria-hidden className="h-6 w-6" strokeWidth={1.75} />
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            {/* Foto e números */}
            <div className="flex items-center gap-6 px-4 pt-2">
              <FotoRedonda src={foto} nome={usuario} className="h-[86px] w-[86px] bg-neutral-800 text-3xl text-neutral-300" />
              <div className="flex flex-1 flex-col gap-1">
                {nome && <span className="text-sm font-semibold">{nome}</span>}
                <div className="grid grid-cols-3 gap-2">
                  {contadores.map(([rotulo, valor]) => (
                    <span key={rotulo} className="flex flex-col">
                      <span className="text-base font-bold tabular-nums">{valor === null ? '—' : numero.format(valor)}</span>
                      <span className="text-[13px] text-neutral-300">{rotulo}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio e link */}
            <div className="px-4 pb-3 pt-3 text-[13px] leading-[18px]">
              {real?.biography ? (
                <p className="m-0 whitespace-pre-line">{real.biography}</p>
              ) : (
                <p className="m-0 text-neutral-400">{real ? 'Sem bio.' : 'Conecte o Instagram para mostrar a bio, os seguidores e a grade de verdade.'}</p>
              )}
              {real?.website && (
                <a href={real.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-sky-300 no-underline">
                  <Link2 aria-hidden className="h-3.5 w-3.5 -rotate-45" strokeWidth={2} />
                  {real.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>

            {/* Botões do perfil */}
            <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
              {['Editar perfil', 'Compartilhar perfil'].map((rotulo) => (
                <span key={rotulo} className="rounded-lg bg-neutral-800 py-1.5 text-center text-[13px] font-semibold">
                  {rotulo}
                </span>
              ))}
            </div>

            {/* Abas da grade */}
            <div className="grid grid-cols-3 border-t border-neutral-800">
              {[Grid3x3, Clapperboard, SquareUser].map((Icone, i) => (
                <span key={i} className={cn('flex justify-center py-2.5', i === 0 ? 'border-b border-neutral-50 text-neutral-50' : 'text-neutral-500')}>
                  <Icone aria-hidden className="h-6 w-6" strokeWidth={1.75} />
                </span>
              ))}
            </div>

            {/* A grade: agendados no topo, depois o que já está no perfil */}
            {posts === null || perfil === null ? (
              <div className="grid grid-cols-3 gap-px">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="aspect-[3/4] animate-pulse bg-neutral-900" />
                ))}
              </div>
            ) : marcados.length + publicados.length === 0 ? (
              <p className="m-0 px-6 py-16 text-center text-sm text-neutral-400">Nenhum post ainda.</p>
            ) : (
              <ul className="m-0 grid grid-cols-3 gap-px p-0">
                {[...marcados, ...publicados].map((quadro) => (
                  <QuadroDaGrade key={quadro.chave} quadro={quadro} onAbrir={onAbrir} />
                ))}
              </ul>
            )}
          </div>

          {/* Barra de baixo do app */}
          <div className="flex shrink-0 items-center justify-around border-t border-neutral-900 px-2 pb-5 pt-2.5">
            {[House, Search, SquarePlay, Send].map((Icone, i) => (
              <Icone key={i} aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            ))}
            <FotoRedonda src={foto} nome={usuario} className="h-6 w-6 border border-neutral-50 bg-neutral-800 text-[10px]" />
          </div>
        </div>
      </div>

      {/* Ao lado: o que a grade mostra */}
      <aside className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-5 text-sm">
        <h2 className="m-0 text-base font-extrabold text-foreground">Como o seu perfil vai ficar</h2>
        <p className="m-0 font-medium text-muted-foreground">
          Os agendados entram no topo da grade, na ordem em que vão sair. Clique num post para ver os detalhes.
        </p>
        <ul className="m-0 flex flex-col gap-2 p-0 text-[13px] font-medium text-foreground">
          <li className="flex list-none items-center gap-2">
            <Clock3 aria-hidden className="h-4 w-4 text-leadnexi-violet-texto" strokeWidth={1.75} />
            {marcados.filter((q) => !q.marcado?.falhou).length} {marcados.filter((q) => !q.marcado?.falhou).length === 1 ? 'agendado' : 'agendados'}
          </li>
          {marcados.some((q) => q.marcado?.falhou) && (
            <li className="flex list-none items-center gap-2">
              <CircleAlert aria-hidden className="h-4 w-4 text-leadnexi-danger" strokeWidth={1.75} />
              {marcados.filter((q) => q.marcado?.falhou).length} {marcados.filter((q) => q.marcado?.falhou).length === 1 ? 'não publicado' : 'não publicados'}
            </li>
          )}
          <li className="flex list-none items-center gap-2">
            <Grid3x3 aria-hidden className="h-4 w-4 text-success-foreground" strokeWidth={1.75} />
            {publicados.length} no perfil
          </li>
        </ul>
        {real ? (
          <a href={`https://www.instagram.com/${real.username}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-leadnexi-cyan-texto no-underline hover:underline">
            <ExternalLink aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Abrir o perfil no Instagram
          </a>
        ) : (
          <p className="m-0 rounded-lg border border-warn-border px-3 py-2 text-[13px] font-medium text-foreground">
            Sem o Instagram conectado, os números e a bio ficam vazios e a grade mostra só os posts do LeadNexi.{' '}
            <Link to="/configuracoes/canais" className="font-bold text-leadnexi-cyan-texto no-underline hover:underline">
              Conectar agora
            </Link>
          </p>
        )}
      </aside>
    </div>
  )
}

function QuadroDaGrade({ quadro, onAbrir }: { quadro: Quadro; onAbrir: (post: Post) => void }) {
  const conteudo = (
    <>
      {quadro.imagem ? (
        <img src={quadro.imagem} alt="" className={cn('h-full w-full object-cover', quadro.marcado && 'opacity-80')} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-neutral-900 text-neutral-500">
          <ImageOff aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      {(quadro.carrossel || quadro.video) && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          {quadro.video ? <SquarePlay aria-hidden className="h-4 w-4" strokeWidth={2} /> : <Copy aria-hidden className="h-4 w-4 -scale-x-100" strokeWidth={2} />}
        </span>
      )}
      {quadro.marcado && (
        <span
          className={cn(
            'absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm',
            quadro.marcado.falhou ? 'bg-red-600/85' : 'bg-black/65',
          )}
        >
          {quadro.marcado.falhou ? <CircleAlert aria-hidden className="h-3 w-3" strokeWidth={2.25} /> : <Clock3 aria-hidden className="h-3 w-3" strokeWidth={2.25} />}
          <span className="truncate">{quadro.marcado.falhou ? 'Não publicado' : quadro.marcado.quando}</span>
        </span>
      )}
    </>
  )
  const classe = 'group relative block aspect-[3/4] w-full overflow-hidden bg-neutral-900'

  return (
    <li className="list-none">
      {quadro.post ? (
        <button type="button" onClick={() => onAbrir(quadro.post!)} className={cn(classe, 'cursor-pointer')} aria-label="Ver os detalhes do post">
          {conteudo}
          <span className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
        </button>
      ) : quadro.link ? (
        <a href={quadro.link} target="_blank" rel="noopener noreferrer" className={classe} aria-label="Abrir o post no Instagram">
          {conteudo}
        </a>
      ) : (
        <span className={classe}>{conteudo}</span>
      )}
    </li>
  )
}
