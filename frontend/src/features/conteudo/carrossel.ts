export type Aspecto = '4:5' | '1:1' | '16:9'

/**
 * Moldura de cada aspecto (a mesma do Rizar). A largura do slide (`--s`) deixa a PONTA do próximo
 * aparecer: `min(100% - 56px, 70vh × aspecto)`; na tela cheia, a altura é a do diálogo. Strings
 * inteiras porque o Tailwind só gera a classe que lê completa no código.
 */
export const MOLDURA: Record<Aspecto, { aspecto: string; gaveta: string; cheia: string; unicoGaveta: string; unicoCheia: string }> = {
  '4:5': {
    aspecto: 'aspect-[4/5]',
    gaveta: '[--s:min(calc(100%_-_56px),calc(70vh_*_4_/_5))]',
    cheia: '[--s:min(calc(100%_-_56px),calc((95vh_-_8rem)_*_4_/_5))]',
    unicoGaveta: 'w-[min(100%,calc(70vh_*_4_/_5))]',
    unicoCheia: 'w-[min(100%,calc((95vh_-_8rem)_*_4_/_5))]',
  },
  '1:1': {
    aspecto: 'aspect-square',
    gaveta: '[--s:min(calc(100%_-_56px),70vh)]',
    cheia: '[--s:min(calc(100%_-_56px),calc(95vh_-_8rem))]',
    unicoGaveta: 'w-[min(100%,70vh)]',
    unicoCheia: 'w-[min(100%,calc(95vh_-_8rem))]',
  },
  '16:9': {
    aspecto: 'aspect-video',
    gaveta: '[--s:min(calc(100%_-_56px),calc(70vh_*_16_/_9))]',
    cheia: '[--s:min(calc(100%_-_56px),calc((95vh_-_8rem)_*_16_/_9))]',
    unicoGaveta: 'w-[min(100%,calc(70vh_*_16_/_9))]',
    unicoCheia: 'w-[min(100%,calc((95vh_-_8rem)_*_16_/_9))]',
  },
}

/** `prefers-reduced-motion: reduce`: sem empurrãozinho e sem rolagem suave. */
export function reduzMovimento() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** Comando de navegação para o trilho rolar: um `seq` novo a cada comando. */
export type Pedido = { i: number; seq: number; instantaneo?: boolean }

/** Aspecto da moldura mais perto da proporção da primeira imagem (padrão: 4:5 do Instagram). */
export function aspectoDas(imagens: { width: number; height: number }[]): Aspecto {
  const primeira = imagens[0]
  if (!primeira?.height) return '4:5'
  const razao = primeira.width / primeira.height
  const opcoes: [Aspecto, number][] = [['4:5', 0.8], ['1:1', 1], ['16:9', 16 / 9]]
  return opcoes.reduce((melhor, atual) => (Math.abs(atual[1] - razao) < Math.abs(melhor[1] - razao) ? atual : melhor))[0]
}
