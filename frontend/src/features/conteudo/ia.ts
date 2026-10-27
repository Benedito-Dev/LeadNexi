import { escreverLegenda, type AvisoDaIA } from '../ia/api'
import type { ImagemPreparada } from './imagens'

/** Lado maior das cópias que a IA vê: basta para entender a imagem e cabe nos 4,5 MB da Vercel. */
const LADO_PARA_A_IA = 1024

/** Cópia menor da imagem, só para a IA ler (a do post continua no tamanho cheio). */
async function reduzirParaAIA(imagem: ImagemPreparada): Promise<Blob> {
  const escala = Math.min(1, LADO_PARA_A_IA / Math.max(imagem.largura, imagem.altura))
  if (escala === 1) return imagem.blob
  const bitmap = await createImageBitmap(imagem.blob)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagem.largura * escala)
  canvas.height = Math.round(imagem.altura * escala)
  const contexto = canvas.getContext('2d')
  if (!contexto) return imagem.blob
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => canvas.toBlob((resultado) => resolve(resultado ?? imagem.blob), 'image/jpeg', 0.8))
}

/** A IA lê as imagens do post (na ordem; a 1ª é a capa) e devolve a legenda e os avisos das regras de ouro. */
export async function escreverLegendaComIA(imagens: ImagemPreparada[]): Promise<{ legenda: string; avisos: AvisoDaIA[] }> {
  const copias = await Promise.all(imagens.map(reduzirParaAIA))
  const { caption, warnings } = await escreverLegenda(copias)
  return { legenda: caption, avisos: warnings }
}
