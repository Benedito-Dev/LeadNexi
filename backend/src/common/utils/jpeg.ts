/**
 * Largura e altura de um JPEG, lidas do cabeçalho (marcador SOF), sem decodificar a imagem.
 * Devolve null se não for um JPEG válido.
 */
export function readJpegSize(
  data: Buffer,
): { width: number; height: number } | null {
  // Todo JPEG começa com FF D8 (SOI)
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    // Preenchimento (FF FF...) entre segmentos
    if (marker === 0xff) {
      offset++;
      continue;
    }
    // Marcadores sem tamanho: SOI, EOI, RSTn, TEM
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd9)
    ) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    // SOF0–SOF15 guardam o tamanho (C4 = DHT, C8 = JPG, CC = DAC não são SOF)
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > data.length) return null;
      const height = data.readUInt16BE(offset + 5);
      const width = data.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}
