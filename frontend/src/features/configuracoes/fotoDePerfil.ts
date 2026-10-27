/** Lado da foto de perfil guardada: basta para o menu e o Perfil, e fica com uns 20 KB. */
const LADO = 256

/** Recorta o meio da imagem num quadrado e converte para JPEG 256x256, no navegador. */
export async function recortarFotoDePerfil(arquivo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const lado = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Canvas indisponível')
  // Fundo branco: PNG com transparência não fica preto no JPEG
  contexto.fillStyle = 'white'
  contexto.fillRect(0, 0, LADO, LADO)
  contexto.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((foto) => (foto ? resolve(foto) : reject(new Error('Falha ao gerar JPEG'))), 'image/jpeg', 0.85),
  )
}
