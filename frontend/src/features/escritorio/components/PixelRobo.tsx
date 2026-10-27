import type { Estado } from '../estado'

/**
 * Robô em pixel art (14 x 14) desenhado só com as cores da marca, que mudam com o tema. Cada
 * personagem tem a sua cor e um detalhe na cabeça; os olhos mostram o estado.
 *
 * Legenda: o contorno · b corpo · h brilho do corpo · f tela do rosto · E olho (linha de cima) ·
 * e olho (linha de baixo) · a luz da antena · k fone (Prospector) · . vazio
 */
const DESENHOS: Record<string, string[]> = {
  // Uma antena no meio
  criador: [
    '......aa......',
    '......oo......',
    '...oooooooo...',
    '..ohhhhhhhho..',
    '..ohffffffbo..',
    '..ohfEffEfbo..',
    '..ohfeffefbo..',
    '..obffffffbo..',
    '..obbbbbbbbo..',
    '...oooooooo...',
    '.....oooo.....',
    '..oobbbbbboo..',
    '.obbbhhhhbbbo.',
    '.obbbbbbbbbbo.',
  ],
  // Duas antenas
  estrategista: [
    '...a......a...',
    '...o......o...',
    '...oooooooo...',
    '..ohhhhhhhho..',
    '..ohffffffbo..',
    '..ohfEffEfbo..',
    '..ohfeffefbo..',
    '..obffffffbo..',
    '..obbbbbbbbo..',
    '...oooooooo...',
    '.....oooo.....',
    '..oobbbbbboo..',
    '.obbbhhhhbbbo.',
    '.obbbbbbbbbbo.',
  ],
  // Fone de ouvido com microfone
  prospector: [
    '......aa......',
    '...kkkkkkkk...',
    '..kooooooook..',
    '..ohhhhhhhho..',
    '.kohffffffbok.',
    '.kohfEffEfbok.',
    '.kohfeffefbok.',
    '..obffffffbkk.',
    '..obbbbbbbbo..',
    '...oooooooo...',
    '.....oooo.....',
    '..oobbbbbboo..',
    '.obbbhhhhbbbo.',
    '.obbbbbbbbbbo.',
  ],
}

const COR_DO_CORPO: Record<string, string> = {
  criador: 'hsl(var(--leadnexi-violet))',
  estrategista: 'hsl(var(--leadnexi-cyan))',
  prospector: 'hsl(var(--muted-foreground))',
}

const COR_DO_ESTADO: Record<Estado, string> = {
  trabalhando: 'hsl(var(--leadnexi-cyan))',
  terminou: 'hsl(var(--success-fg))',
  falhou: 'hsl(var(--leadnexi-danger))',
  dormindo: 'hsl(var(--muted-foreground))',
}

const ESCURO = 'hsl(var(--sidebar-bg))'

type PixelRoboProps = { personagem: string; estado: Estado; pixel?: number; className?: string }

export function PixelRobo({ personagem, estado, pixel = 6, className }: PixelRoboProps) {
  const desenho = DESENHOS[personagem] ?? DESENHOS.criador
  const corpo = COR_DO_CORPO[personagem] ?? COR_DO_CORPO.criador
  const luz = COR_DO_ESTADO[estado]
  const cores: Record<string, string> = {
    o: ESCURO,
    f: ESCURO,
    k: ESCURO,
    b: corpo,
    h: `color-mix(in srgb, ${corpo} 60%, white)`,
    a: luz,
  }
  // Olhos: abertos trabalhando ou com erro; meia-lua feliz quando termina; fechados dormindo
  const olhoDeCima = estado === 'dormindo' ? null : luz
  const olhoDeBaixo = estado === 'terminou' ? null : estado === 'dormindo' ? 'hsl(var(--muted-foreground))' : luz

  const pixels: { x: number; y: number; cor: string }[] = []
  const olhos: { x: number; y: number; cor: string }[] = []
  desenho.forEach((linha, y) =>
    [...linha].forEach((c, x) => {
      if (c === '.') return
      if (c === 'E') {
        pixels.push({ x, y, cor: ESCURO })
        if (olhoDeCima) olhos.push({ x, y, cor: olhoDeCima })
      } else if (c === 'e') {
        pixels.push({ x, y, cor: ESCURO })
        if (olhoDeBaixo) olhos.push({ x, y, cor: olhoDeBaixo })
      } else pixels.push({ x, y, cor: cores[c] })
    }),
  )

  return (
    <svg
      viewBox="0 0 14 14"
      width={14 * pixel}
      height={14 * pixel}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
    >
      {pixels.map(({ x, y, cor }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cor} />
      ))}
      <g className={estado === 'trabalhando' || estado === 'terminou' ? 'lnx-robo-olhos' : undefined}>
        {olhos.map(({ x, y, cor }) => (
          <rect key={`olho-${x}-${y}`} x={x} y={y} width={1} height={1} fill={cor} />
        ))}
      </g>
    </svg>
  )
}
