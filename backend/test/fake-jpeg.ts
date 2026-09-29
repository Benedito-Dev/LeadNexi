// Só para testes: JPEG mínimo (cabeçalho com o tamanho), sem pixels de verdade.

/** Cabeçalho mínimo de JPEG: SOI + APP0 + SOF (baseline ou progressivo) + EOI */
export function fakeJpeg(width: number, height: number, sof = 0xc0): Buffer {
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const sofSegment = Buffer.alloc(19);
  sofSegment.writeUInt16BE(0xff00 | sof, 0);
  sofSegment.writeUInt16BE(17, 2);
  sofSegment[4] = 8;
  sofSegment.writeUInt16BE(height, 5);
  sofSegment.writeUInt16BE(width, 7);
  sofSegment[9] = 3;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sofSegment,
    Buffer.from([0xff, 0xd9]),
  ]);
}
