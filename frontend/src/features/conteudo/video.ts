// Vídeo de Reel, preparado no navegador antes de enviar: confere formato, tamanho e duração (os
// limites da Meta para Reel pela API) e tira um quadro para ser a capa.

const FORMATOS = ['video/mp4', 'video/quicktime']
export const MAX_BYTES_DO_VIDEO = 300 * 1024 * 1024
const MIN_MS = 3_000
const MAX_MS = 15 * 60 * 1000
/** Lado maior da capa: basta para o Instagram (a capa de Reel é 9:16) */
const LADO_DA_CAPA = 1080

export type VideoPreparado = {
  arquivo: File
  /** URL local (blob:) para tocar a prévia */
  previa: string
  largura: number
  altura: number
  duracaoMs: number
  /** Capa em JPEG (um quadro do vídeo) e a URL local dela */
  capa: Blob
  capaPrevia: string
}

export const ehVideo = (arquivo: File) => arquivo.type.startsWith('video/')

/** "0:15", "1:03", "12:40" */
export function formatarDuracao(ms: number) {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** "12 MB", "850 KB" */
export function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const esperar = (alvo: HTMLVideoElement, evento: 'loadedmetadata' | 'seeked') =>
  new Promise<void>((resolve, reject) => {
    alvo.addEventListener(evento, () => resolve(), { once: true })
    alvo.addEventListener('error', () => reject(new Error('Não deu para ler esse vídeo no navegador. Exporte em MP4 (H.264) e tente de novo.')), { once: true })
  })

/** Lê o vídeo, confere os limites do Reel e tira a capa (o quadro de 1 s, ou do meio, se for curto). */
export async function prepararVideo(arquivo: File): Promise<VideoPreparado> {
  if (!FORMATOS.includes(arquivo.type)) throw new Error('O vídeo precisa ser MP4 ou MOV.')
  if (arquivo.size > MAX_BYTES_DO_VIDEO) throw new Error('O vídeo pode ter no máximo 300 MB.')

  const previa = URL.createObjectURL(arquivo)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = previa
    await esperar(video, 'loadedmetadata')
    const duracaoMs = Math.round(video.duration * 1000)
    if (!Number.isFinite(duracaoMs) || duracaoMs < MIN_MS) throw new Error('O vídeo precisa ter pelo menos 3 segundos.')
    if (duracaoMs > MAX_MS) throw new Error('O vídeo pode ter no máximo 15 minutos.')

    video.currentTime = Math.min(1, video.duration / 2)
    await esperar(video, 'seeked')
    const escala = Math.min(1, LADO_DA_CAPA / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * escala)
    canvas.height = Math.round(video.videoHeight * escala)
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Não deu para tirar a capa do vídeo.')
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height)
    const capa = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não deu para tirar a capa do vídeo.'))), 'image/jpeg', 0.9),
    )
    return { arquivo, previa, largura: video.videoWidth, altura: video.videoHeight, duracaoMs, capa, capaPrevia: URL.createObjectURL(capa) }
  } catch (erro) {
    URL.revokeObjectURL(previa)
    throw erro
  }
}

/** Envia o arquivo com PUT direto para o link (bucket ou, no desenvolvimento, a API), contando o progresso. */
export function enviarComProgresso(url: string, arquivo: Blob, cabecalhos: Record<string, string>, aoProgredir: (fracao: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const pedido = new XMLHttpRequest()
    pedido.open('PUT', url)
    Object.entries(cabecalhos).forEach(([nome, valor]) => pedido.setRequestHeader(nome, valor))
    pedido.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total)
    pedido.onload = () => (pedido.status >= 200 && pedido.status < 300 ? resolve() : reject(new Error(`O envio do vídeo foi recusado (erro ${pedido.status}).`)))
    pedido.onerror = () => reject(new Error('A conexão caiu no meio do envio do vídeo. Tente de novo.'))
    pedido.send(arquivo)
  })
}
