import { fakeJpeg } from '../../../test/fake-jpeg.js';
import { readJpegSize } from './jpeg.js';

describe('readJpegSize', () => {
  it('lê largura e altura do cabeçalho', () => {
    expect(readJpegSize(fakeJpeg(1080, 1350))).toEqual({
      width: 1080,
      height: 1350,
    });
  });

  it('entende JPEG progressivo', () => {
    expect(readJpegSize(fakeJpeg(1440, 754, 0xc2))).toEqual({
      width: 1440,
      height: 754,
    });
  });

  it('recusa o que não é JPEG', () => {
    expect(readJpegSize(Buffer.from('\x89PNG\r\n\x1a\n'))).toBeNull();
    expect(readJpegSize(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(readJpegSize(Buffer.alloc(0))).toBeNull();
  });
});
