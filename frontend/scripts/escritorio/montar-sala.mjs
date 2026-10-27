// Monta a sala do Escritório (320 x 200 px) com as peças do Pixel Office, de 2dPig (CC0, ver
// pixel-office-2dpig/LICENSE.txt), e grava em public/escritorio/sala.png; separa também os
// personagens em public/escritorio/personagens/. Rodar depois de mudar
// a planta: `npm run escritorio:sala`. As posições dos agentes na tela (src/features/escritorio/
// planta.ts) usam as mesmas coordenadas.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const aqui = dirname(fileURLToPath(import.meta.url))
const folha = PNG.sync.read(readFileSync(join(aqui, 'pixel-office-2dpig/PixelOfficeAssets.png')))
const exemplo = PNG.sync.read(readFileSync(join(aqui, 'pixel-office-2dpig/PixelOffice.png')))
const SAIDA = join(aqui, '../../public/escritorio/sala.png')

const W = 320
const H = 200
const PAREDE = 56
const sala = new PNG({ width: W, height: H })

const pinta = (x, y, cor) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 4
  sala.data[i] = parseInt(cor.slice(0, 2), 16)
  sala.data[i + 1] = parseInt(cor.slice(2, 4), 16)
  sala.data[i + 2] = parseInt(cor.slice(4, 6), 16)
  sala.data[i + 3] = 255
}
const retangulo = (x, y, w, h, cor) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pinta(x + i, y + j, cor)
}
const corEm = (img, x, y) => {
  const i = (y * img.width + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** Cola um recorte; `pular` = cores que viram transparentes (o chão do exemplo, para o tapete aparecer). */
const cola = (img, sx, sy, w, h, dx, dy, pular = new Set()) => {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (img.data[((sy + j) * img.width + sx + i) * 4 + 3] < 128) continue
      const cor = corEm(img, sx + i, sy + j)
      if (!pular.has(cor)) pinta(dx + i, dy + j, cor)
    }
}

/** Cada peça da folha: região ligada de pixels não transparentes, na ordem de leitura. */
function acharPecas(img) {
  const { width, height, data } = img
  const visto = new Uint8Array(width * height)
  const pecas = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (visto[y * width + x] || !data[(y * width + x) * 4 + 3]) continue
      let minX = x, maxX = x, minY = y, maxY = y, n = 0
      const pilha = [[x, y]]
      visto[y * width + x] = 1
      while (pilha.length) {
        const [cx, cy] = pilha.pop()
        n++
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || visto[ny * width + nx] || !data[(ny * width + nx) * 4 + 3]) continue
          visto[ny * width + nx] = 1
          pilha.push([nx, ny])
        }
      }
      if (n >= 4) pecas.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
    }
  return pecas
}
const PECAS = acharPecas(folha)
const peca = (id, dx, dy) => {
  const p = PECAS[id]
  cola(folha, p.x, p.y, p.w, p.h, dx, dy)
}
// Os números das peças usadas (ordem de leitura da folha)
const P = {
  janela: 27, janelaComRecado: 28, porta: 42, relogio: 38, calendario: 17, quadro: 25, quadroAzul: 23, quadroLaranja: 24,
  maquinaDeLanche: 44, geladeira: 45, bebedouro: 54, mesinha: 8, mesaComprida: 9, cafeteira: 19, caneca: 26, planta: 13,
  sofaLaranja: 43, sofaAzul: 18, sofaVerde: 29, gato: 47, cachorro: 59, impressora: 36, lixeiraVerde: 56, lixeiraVermelha: 57, lixeiraAzul: 58,
}

/** Tapete com borda e um xadrez discreto: cada sala com a sua cor, como no Gather. */
const tapete = (x, y, w, h, base, risco, borda) => {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const naBorda = i < 2 || j < 2 || i >= w - 2 || j >= h - 2
      pinta(x + i, y + j, naBorda ? borda : ((i >> 2) + (j >> 2)) % 2 ? risco : base)
    }
}

// Parede: topo escuro, listras claras e rodapé (cores do exemplo)
retangulo(0, 0, W, 4, '566c86')
for (let y = 4; y < PAREDE - 4; y++) retangulo(0, y, W, 1, (y - 4) % 10 === 9 ? '94b0c2' : 'f4f4f4')
retangulo(0, PAREDE - 4, W, 3, '566c86')
retangulo(0, PAREDE - 1, W, 1, '333c57')
// Chão: fileiras de 8 px em tijolinho
for (let y = PAREDE; y < H; y++) {
  const fileira = Math.floor((y - PAREDE) / 8)
  const dentro = (y - PAREDE) % 8
  for (let x = 0; x < W; x++) {
    const junta = (x + (fileira % 2) * 12) % 24 === 0
    pinta(x, y, dentro === 0 || junta ? '29366f' : dentro === 1 ? '73eff7' : '41a6f6')
  }
}

// Na parede
peca(P.janela, 30, 12)
peca(P.janelaComRecado, 264, 12)
peca(P.porta, 152, PAREDE - 31)
peca(P.relogio, 150, 15)
peca(P.calendario, 96, 22)
peca(P.quadro, 214, 24); peca(P.quadroAzul, 228, 24); peca(P.quadroLaranja, 236, 24)
// Encostado na parede
peca(P.maquinaDeLanche, 2, PAREDE - 26)
peca(P.mesinha, 62, PAREDE - 8); peca(P.cafeteira, 70, PAREDE - 15); peca(P.caneca, 64, PAREDE - 12)
peca(P.planta, 132, PAREDE - 13); peca(P.planta, 174, PAREDE - 13)
peca(P.geladeira, 294, PAREDE - 23)
peca(P.bebedouro, 282, PAREDE - 9)

// Áreas de trabalho: tapete cinza e o bloco de baias do exemplo (sem gente), uma por agente
const CHAO_DO_EXEMPLO = new Set(['41a6f6', '73eff7', '29366f', '3b5dc9'])
const BAIA = { x: 33, y: 131, w: 80, h: 31 }
for (const x of [14, 120, 226]) {
  tapete(x - 6, 68, BAIA.w + 12, 50, '94b0c2', '8aa5b8', '566c86')
  cola(exemplo, BAIA.x, BAIA.y, BAIA.w, BAIA.h, x, 76, CHAO_DO_EXEMPLO)
  // A divisória do exemplo tem uma bandeira: vira um quadro
  retangulo(x + 64, 82, 11, 9, '94b0c2')
  peca(P.quadro, x + 64, 82)
}

// Copa: tapete quente, um sofá por agente, mesinha, planta e os bichos
tapete(6, 128, 150, 66, 'ffcd75', 'f5c06a', 'ef7d57')
peca(P.sofaLaranja, 16, 140); peca(P.sofaAzul, 58, 140); peca(P.sofaVerde, 100, 140); peca(P.planta, 140, 134)
peca(P.mesaComprida, 30, 166)
peca(P.gato, 112, 170); peca(P.cachorro, 126, 178)
// Canto da impressora
peca(P.mesinha, 250, 160); peca(P.impressora, 258, 154)
peca(P.lixeiraVerde, 286, 166); peca(P.lixeiraVermelha, 296, 166); peca(P.lixeiraAzul, 306, 166)
peca(P.planta, 230, 156)

writeFileSync(SAIDA, PNG.sync.write(sala))
console.log(`Sala gravada em ${SAIDA}`)

// Personagens: cada um num PNG próprio, com fundo transparente (a tela põe por cima da sala)
const PERSONAGENS = { ruiva: 30, oculos: 33, moreno: 31, ruivaSolta: 51, morena: 52 }
const pastaDosPersonagens = join(aqui, '../../public/escritorio/personagens')
mkdirSync(pastaDosPersonagens, { recursive: true })
for (const [nome, id] of Object.entries(PERSONAGENS)) {
  const { x, y, w, h } = PECAS[id]
  const recorte = new PNG({ width: w, height: h })
  PNG.bitblt(folha, recorte, x, y, w, h, 0, 0)
  writeFileSync(join(pastaDosPersonagens, `${nome}.png`), PNG.sync.write(recorte))
  console.log(`Personagem ${nome}: ${w} x ${h}`)
}

// Frente dos sofás (do assento para baixo): a tela desenha por cima de quem está sentado, para as
// pernas sumirem atrás do assento
const ASSENTO = 8
for (const [nome, id] of Object.entries({ laranja: P.sofaLaranja, azul: P.sofaAzul, verde: P.sofaVerde })) {
  const { x, y, w, h } = PECAS[id]
  const frente = new PNG({ width: w, height: h - ASSENTO })
  PNG.bitblt(folha, frente, x, y + ASSENTO, w, h - ASSENTO, 0, 0)
  writeFileSync(join(pastaDosPersonagens, `../sofa-${nome}.png`), PNG.sync.write(frente))
}
