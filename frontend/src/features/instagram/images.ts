// Preparo das imagens para o Instagram, no navegador (sem depender do servidor):
// a API só aceita JPEG, com proporção entre 4:5 (retrato) e 1,91:1 (paisagem).

export const MAX_IMAGES = 10
export const CAPTION_LIMIT = 2200
export const HASHTAG_LIMIT = 30
/** Lado maior depois do preparo: acima disso o Instagram reduz de qualquer forma */
const MAX_SIDE = 1440
const MIN_RATIO = 4 / 5
const MAX_RATIO = 1.91

export interface PreparedImage {
  id: string
  /** Nome original, para exibição */
  name: string
  /** JPEG pronto para envio */
  blob: Blob
  /** URL local (blob:) para a miniatura */
  previewUrl: string
  width: number
  height: number
  /** Proporção dentro do que o Instagram aceita */
  ratioOk: boolean
}

/** Converte qualquer imagem (PNG, HEIC suportado pelo navegador, WebP...) em JPEG redimensionado. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponível')
  // Fundo branco: PNG com transparência não fica preto no JPEG
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Falha ao gerar JPEG'))), 'image/jpeg', 0.9),
  )
  const ratio = width / height
  return {
    id: crypto.randomUUID(),
    name: file.name,
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    ratioOk: ratio >= MIN_RATIO - 0.01 && ratio <= MAX_RATIO + 0.01,
  }
}

export function countHashtags(caption: string): number {
  return caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0
}
