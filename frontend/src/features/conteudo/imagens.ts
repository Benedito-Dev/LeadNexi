// Preparo das imagens para o Instagram, no navegador: a API só aceita JPEG, com proporção entre
// 4:5 (retrato) e 1,91:1 (paisagem).

export const MAX_IMAGENS = 10
export const LIMITE_DA_LEGENDA = 2200
export const LIMITE_DE_HASHTAGS = 30
/** Lado maior depois do preparo: acima disso o Instagram reduz de qualquer forma */
const LADO_MAXIMO = 1440
const PROPORCAO_MINIMA = 4 / 5
const PROPORCAO_MAXIMA = 1.91

export type ImagemPreparada = {
  id: string
  /** Nome original, para exibição */
  nome: string
  /** JPEG pronto para envio */
  blob: Blob
  /** URL local (blob:) para a miniatura */
  previa: string
  largura: number
  altura: number
  /** Proporção dentro do que o Instagram aceita */
  proporcaoOk: boolean
}

/** Converte qualquer imagem (PNG, WebP, HEIC que o navegador lê...) em JPEG redimensionado. */
export async function prepararImagem(arquivo: Blob, nome: string): Promise<ImagemPreparada> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Canvas indisponível')
  // Fundo branco: PNG com transparência não fica preto no JPEG
  contexto.fillStyle = 'white'
  contexto.fillRect(0, 0, largura, altura)
  contexto.drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((resultado) => (resultado ? resolve(resultado) : reject(new Error('Falha ao gerar JPEG'))), 'image/jpeg', 0.9),
  )
  const proporcao = largura / altura
  return {
    id: crypto.randomUUID(),
    nome,
    blob,
    previa: URL.createObjectURL(blob),
    largura,
    altura,
    proporcaoOk: proporcao >= PROPORCAO_MINIMA - 0.01 && proporcao <= PROPORCAO_MAXIMA + 0.01,
  }
}

/** Hashtags da legenda, na ordem, sem repetir. */
export const hashtagsDa = (legenda: string) => [...new Set(legenda.match(/#[\p{L}\p{N}_]+/gu) ?? [])]

export const contarHashtags = (legenda: string) => legenda.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0
