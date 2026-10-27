import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Maximize2, MoveHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOLDURA, reduzMovimento, type Aspecto, type Pedido } from '../carrossel'
import type { ImagemDoPost } from '../tipos'

/** Espaço entre slides no trilho (o `gap-3`): entra na conta do passo. */
const GAP_TRILHO_PX = 12
/** Até quantos px de deslocamento o gesto ainda é clique (abre a tela cheia). */
const LIMIAR_CLIQUE_PX = 4
/** Fração do passo que o arrasto precisa vencer para encaixar no vizinho. */
const LIMIAR_ENCAIXE = 0.15

/**
 * Para qual slide o trilho encaixa quando o mouse solta o arrasto. Conta a partir do slide em que
 * o arrasto COMEÇOU; até 15% do passo volta para o mesmo, passou disso anda pelo menos 1, e anda
 * mais se cruzou vários.
 */
function alvoDoArrasto(base: number, dx: number, passo: number, total: number) {
  const andou = -dx / (passo > 0 ? passo : 1)
  let alvo = base
  if (andou > LIMIAR_ENCAIXE) alvo = base + Math.max(1, Math.round(andou))
  else if (andou < -LIMIAR_ENCAIXE) alvo = base - Math.max(1, Math.round(-andou))
  return Math.max(0, Math.min(total - 1, alvo))
}

type Props = {
  imagens: ImagemDoPost[]
  indice: number
  pedido: Pedido
  /** A pessoa rolou até `i` (destaque ao vivo, sem pedido). */
  onRolar: (i: number) => void
  /** Comando de navegação (soltar o arrasto). */
  onIr: (i: number) => void
  /** Clique sem arrasto no slide `i` (tela cheia). */
  onTocar?: (i: number) => void
  variante?: 'gaveta' | 'cheia'
  aspecto: Aspecto
  /** Empurrãozinho único ao abrir. */
  cutucar?: boolean
  /** `undefined` = sem dica. */
  dicaVisivel?: boolean
}

/**
 * Carrossel de ARRASTAR (réplica do Rizar): trilho horizontal com scroll-snap, slide centralizado
 * e a ponta do próximo aparecendo; vizinhos apagados. O destaque muda DURANTE o deslize; o mouse
 * arrasta (toque e trackpad usam a rolagem nativa); clique sem arrasto abre a tela cheia.
 */
export function TrilhoDeSlides({ imagens, indice, pedido, onRolar, onIr, onTocar, variante = 'gaveta', aspecto, cutucar = false, dicaVisivel }: Props) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const indiceRef = useRef(indice)
  const quadroRafRef = useRef(0)
  const arrastoRef = useRef<{ x: number; dx: number; left: number; base: number; id: number; moveu: boolean } | null>(null)
  const arrastouRef = useRef(false)
  const limparCliqueRef = useRef(0)
  const seqVistoRef = useRef(pedido.seq)
  const total = imagens.length
  const moldura = MOLDURA[aspecto]
  const emTelaCheia = variante === 'cheia'

  useLayoutEffect(() => {
    indiceRef.current = indice
  })

  // Passo = largura do slide + gap. `offsetWidth` é a largura de layout: não encolhe com o
  // `scale(.97)` do slide apagado nem com o zoom de entrada do diálogo.
  const passo = useCallback(() => {
    const slide = trilhoRef.current?.querySelector<HTMLElement>('[data-slide-indice]')
    return slide ? slide.offsetWidth + GAP_TRILHO_PX : 1
  }, [])

  const rolarPara = useCallback(
    (i: number, instantaneo?: boolean) => {
      trilhoRef.current?.scrollTo({ left: i * passo(), behavior: instantaneo || reduzMovimento() ? 'instant' : 'smooth' })
    },
    [passo],
  )

  // Ao montar (inclusive a tela cheia abrindo), já nasce no slide ativo
  useLayoutEffect(() => {
    rolarPara(indiceRef.current, true)
  }, [rolarPara])

  // Comando de navegação: rola até o slide pedido
  useEffect(() => {
    if (pedido.seq === seqVistoRef.current) return
    seqVistoRef.current = pedido.seq
    rolarPara(pedido.i, pedido.instantaneo)
  }, [pedido, rolarPara])

  // Destaque instantâneo: a cada quadro do deslize, o slide que passou da metade vira o ativo
  useEffect(() => {
    const el = trilhoRef.current
    if (!el) return
    const aoRolar = () => {
      if (quadroRafRef.current) return
      quadroRafRef.current = requestAnimationFrame(() => {
        quadroRafRef.current = 0
        const novo = Math.max(0, Math.min(total - 1, Math.round(el.scrollLeft / passo())))
        if (novo !== indiceRef.current) {
          indiceRef.current = novo
          onRolar(novo)
        }
      })
    }
    el.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      el.removeEventListener('scroll', aoRolar)
      if (quadroRafRef.current) cancelAnimationFrame(quadroRafRef.current)
      quadroRafRef.current = 0
    }
  }, [total, passo, onRolar])

  // Janela redimensionada: o passo muda, o slide ativo continua no lugar
  useEffect(() => {
    const aoRedimensionar = () => rolarPara(indiceRef.current, true)
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [rolarPara])

  useEffect(() => () => window.clearTimeout(limparCliqueRef.current), [])

  const aoPressionar = (e: React.PointerEvent<HTMLDivElement>) => {
    arrastouRef.current = false
    if (e.pointerType !== 'mouse' || e.button !== 0 || !trilhoRef.current) return
    arrastoRef.current = { x: e.clientX, dx: 0, left: trilhoRef.current.scrollLeft, base: indiceRef.current, id: e.pointerId, moveu: false }
  }

  const aoMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const arrasto = arrastoRef.current
    const el = trilhoRef.current
    if (!arrasto || !el) return
    arrasto.dx = e.clientX - arrasto.x
    if (!arrasto.moveu && Math.abs(arrasto.dx) > LIMIAR_CLIQUE_PX) {
      arrasto.moveu = true
      // Atributo imperativo (síncrono): tira o snap e a rolagem suave já no 1º movimento
      el.setAttribute('data-arrastando', 'true')
      el.setPointerCapture?.(arrasto.id)
    }
    if (arrasto.moveu) el.scrollLeft = arrasto.left - arrasto.dx
  }

  const aoSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    const arrasto = arrastoRef.current
    const el = trilhoRef.current
    arrastoRef.current = null
    if (!arrasto || !arrasto.moveu || !el) return
    if (e.type !== 'pointercancel') arrasto.dx = e.clientX - arrasto.x
    el.removeAttribute('data-arrastando')
    try {
      el.releasePointerCapture?.(arrasto.id)
    } catch {
      // ponteiro já liberado pelo navegador
    }
    // O `click` deste mesmo gesto vem logo depois e precisa ser engolido; se não vier, a marca some
    arrastouRef.current = true
    window.clearTimeout(limparCliqueRef.current)
    limparCliqueRef.current = window.setTimeout(() => {
      arrastouRef.current = false
    }, 0)
    onIr(alvoDoArrasto(arrasto.base, arrasto.dx, passo(), total))
  }

  const aoClicar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (arrastouRef.current) {
      arrastouRef.current = false
      return
    }
    if (!onTocar) return
    const slide = (e.target as HTMLElement).closest('[data-slide-indice]')
    onTocar(slide ? Number(slide.getAttribute('data-slide-indice')) : indiceRef.current)
  }

  return (
    <div className="relative">
      <div
        ref={trilhoRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Imagens do post. Arraste ou use as setas do teclado."
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClick={aoClicar}
        onKeyDown={(e) => {
          if (onTocar && e.key === 'Enter' && e.target === e.currentTarget) {
            e.preventDefault()
            onTocar(indiceRef.current)
          }
        }}
        className={cn(
          'relative flex cursor-grab select-none gap-3 overflow-x-auto overscroll-x-contain rounded-lg',
          'snap-x snap-mandatory motion-safe:scroll-smooth',
          '[padding-inline:calc((100%_-_var(--s))_/_2)] [scrollbar-width:none] [touch-action:pan-x_pan-y] [&::-webkit-scrollbar]:hidden',
          'data-[arrastando=true]:cursor-grabbing data-[arrastando=true]:snap-none data-[arrastando=true]:[scroll-behavior:auto]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan',
          emTelaCheia ? moldura.cheia : moldura.gaveta,
        )}
      >
        {imagens.map((imagem, i) => {
          const ativo = i === indice
          return (
            <div
              key={imagem.id}
              data-slide-indice={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} de ${total}`}
              className={cn(
                'group relative shrink-0 grow-0 basis-[var(--s)] snap-center overflow-hidden rounded-lg',
                'transition-[opacity,transform] duration-150',
                moldura.aspecto,
                !ativo && 'scale-[.97] opacity-45',
                cutucar && 'motion-safe:animate-cutucar',
              )}
            >
              <img
                src={imagem.url}
                alt={`Imagem ${i + 1} de ${total}${emTelaCheia ? ' em tela cheia' : ''}`}
                draggable={false}
                className="pointer-events-none block h-full w-full select-none object-cover [-webkit-user-drag:none]"
              />
              <span aria-hidden className="pointer-events-none absolute left-2 top-2 rounded-md border border-border bg-background/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {i + 1}/{total}
              </span>
              {/* "Tela cheia" só no ativo, no hover: o clique sobe para o trilho (mesma regra clique × arrasto) */}
              {ativo && onTocar && (
                <button
                  type="button"
                  aria-label={`Ampliar slide ${i + 1} em tela cheia`}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground opacity-0 transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                >
                  <Maximize2 aria-hidden className="h-3 w-3" strokeWidth={2} /> Tela cheia
                </button>
              )}
            </div>
          )
        })}
      </div>

      {dicaVisivel !== undefined && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background/90 px-3 py-1.5 text-sm font-semibold text-foreground transition-opacity [transition-duration:400ms]',
            dicaVisivel ? 'opacity-100' : 'opacity-0',
          )}
        >
          <MoveHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Arraste para ver os próximos
        </span>
      )}
    </div>
  )
}
