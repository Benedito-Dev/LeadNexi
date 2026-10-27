import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImageOff, Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { aspectoDas, MOLDURA, reduzMovimento, type Aspecto, type Pedido } from '../carrossel'
import type { ImagemDoPost } from '../tipos'
import { TrilhoDeSlides } from './TrilhoDeSlides'

/** Seta dentro de campo de texto é do campo, não do carrossel. */
const teclaEhDoCampo = (alvo: EventTarget | null) => alvo instanceof HTMLElement && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))

/**
 * A arte do post GRANDE (réplica do visualizador do Rizar): carrossel de arrastar com a ponta do
 * próximo slide aparecendo, dica "Arraste para ver os próximos" e empurrãozinho único ao abrir,
 * miniaturas embaixo, teclado ← → e clique sem arrasto = tela cheia. Uma imagem só: a arte
 * inteira, clicável para a tela cheia.
 */
export function VisualizadorDoPost({ imagens }: { imagens: ImagemDoPost[] }) {
  // Reel: o vídeo toca ali mesmo, em pé, com a capa enquanto não começa
  const video = imagens[0]?.kind === 'VIDEO' ? imagens[0] : null
  if (video?.videoUrl) {
    return (
      <video
        src={video.videoUrl}
        poster={video.url}
        controls
        playsInline
        preload="metadata"
        aria-label="Vídeo do Reel"
        className="mx-auto block max-h-[70vh] w-auto max-w-full rounded-lg bg-black"
      />
    )
  }
  return <VisualizadorDeImagens imagens={imagens} />
}

/** Foto única ou carrossel: a arte na gaveta e em tela cheia. */
function VisualizadorDeImagens({ imagens }: { imagens: ImagemDoPost[] }) {
  const total = imagens.length
  const multi = total > 1
  const aspecto = aspectoDas(imagens)
  const [indice, setIndice] = useState(0)
  // Comando de navegação para os trilhos (gaveta e tela cheia) rolarem
  const [pedido, setPedido] = useState<Pedido>({ i: 0, seq: 0 })
  const [telaCheia, setTelaCheia] = useState(false)
  const [dicaVisivel, setDicaVisivel] = useState(multi)
  const [cutucar] = useState(() => !reduzMovimento())
  const indiceRef = useRef(0)
  const miniaturasRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    indiceRef.current = indice
  })

  /** Comando de navegação: muda o ativo E manda os trilhos rolarem até ele. */
  const ir = useCallback(
    (novo: number, instantaneo = false) => {
      const alvo = Math.max(0, Math.min(total - 1, novo))
      indiceRef.current = alvo
      setIndice(alvo)
      setPedido((p) => ({ i: alvo, seq: p.seq + 1, instantaneo }))
    },
    [total],
  )

  /** Navegação da pessoa (miniatura, teclado, arrasto): a dica já cumpriu o papel. */
  const navegar = useCallback(
    (novo: number) => {
      setDicaVisivel(false)
      ir(novo)
    },
    [ir],
  )

  /** Destaque ao vivo vindo da rolagem: só reporta, não rola. */
  const aoRolar = useCallback((novo: number) => {
    indiceRef.current = novo
    setIndice(novo)
    setDicaVisivel(false)
  }, [])

  const abrirTelaCheia = useCallback(
    (i?: number) => {
      if (typeof i === 'number' && i !== indiceRef.current) ir(i)
      setTelaCheia(true)
    },
    [ir],
  )

  // Teclado ← → enquanto o painel (ou a tela cheia) está aberto
  useEffect(() => {
    if (!multi) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.defaultPrevented || teclaEhDoCampo(e.target)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navegar(indiceRef.current - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navegar(indiceRef.current + 1)
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [multi, navegar])

  // A miniatura ativa sempre visível na fileira (carrossel de 10 estoura a largura)
  useEffect(() => {
    miniaturasRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [indice])

  if (total === 0) {
    return (
      <div className="mx-auto grid aspect-[4/5] w-[min(100%,calc(70vh_*_4_/_5))] place-items-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff aria-hidden className="h-8 w-8" strokeWidth={1.75} />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {multi ? (
        <TrilhoDeSlides
          imagens={imagens}
          indice={indice}
          pedido={pedido}
          onRolar={aoRolar}
          onIr={navegar}
          onTocar={abrirTelaCheia}
          aspecto={aspecto}
          cutucar={cutucar}
          dicaVisivel={dicaVisivel}
        />
      ) : (
        <ArteUnica imagem={imagens[0]} aspecto={aspecto} onAbrir={() => abrirTelaCheia()} />
      )}

      {/* Leitor de tela ouve a troca de slide (o contador visual é aria-hidden) */}
      {multi && (
        <span className="sr-only" aria-live="polite">
          Slide {indice + 1} de {total}
        </span>
      )}

      {multi && (
        <div className="overflow-x-auto pb-1">
          <div ref={miniaturasRef} className="mx-auto flex w-max gap-2">
            {imagens.map((imagem, i) => {
              const ativa = i === indice
              return (
                <button
                  key={imagem.id}
                  type="button"
                  aria-label={`Ver slide ${i + 1}`}
                  aria-current={ativa ? 'true' : undefined}
                  onClick={() => navegar(i)}
                  className={cn(
                    'block w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted p-0 transition-opacity duration-100',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan',
                    ativa ? 'opacity-100 ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'opacity-55 hover:opacity-100',
                  )}
                >
                  <img src={imagem.url} alt="" draggable={false} className="block aspect-[4/5] w-full object-cover" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Dialog
        open={telaCheia}
        onOpenChange={(aberta) => {
          setTelaCheia(aberta)
          // A tela cheia pode ter sido rolada por toque/trackpad: o painel volta no slide em que parou
          if (!aberta) ir(indiceRef.current, true)
        }}
      >
        <DialogContent className="flex h-[95vh] max-h-none w-[95vw] max-w-none flex-col gap-3 overflow-hidden p-4 font-marca sm:max-w-none sm:p-6">
          <DialogTitle className="pr-8 text-base font-bold">{multi ? `Slide ${indice + 1} de ${total}` : 'Arte do post'}</DialogTitle>
          <DialogDescription className="sr-only">Arte do post em tela cheia. Arraste ou use as setas do teclado para navegar e Esc para fechar.</DialogDescription>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {multi ? (
              <TrilhoDeSlides imagens={imagens} indice={indice} pedido={pedido} onRolar={aoRolar} onIr={navegar} variante="cheia" aspecto={aspecto} />
            ) : (
              <ArteUnica imagem={imagens[0]} aspecto={aspecto} emTelaCheia />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Uma imagem só: a moldura tem o tamanho exato da arte; clicar amplia (no painel). */
function ArteUnica({ imagem, aspecto, onAbrir, emTelaCheia = false }: { imagem: ImagemDoPost; aspecto: Aspecto; onAbrir?: () => void; emTelaCheia?: boolean }) {
  const moldura = MOLDURA[aspecto]
  const classe = cn('relative mx-auto overflow-hidden rounded-lg', moldura.aspecto, emTelaCheia ? moldura.unicoCheia : moldura.unicoGaveta)
  const arte = <img src={imagem.url} alt="Imagem do post" draggable={false} className="block h-full w-full object-cover" />
  if (!onAbrir) return <div className={classe}>{arte}</div>
  return (
    <button type="button" aria-label="Ampliar arte em tela cheia" onClick={onAbrir} className={cn(classe, 'group cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan')}>
      {arte}
      <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Maximize2 aria-hidden className="h-3 w-3" strokeWidth={2} /> Tela cheia
      </span>
    </button>
  )
}
