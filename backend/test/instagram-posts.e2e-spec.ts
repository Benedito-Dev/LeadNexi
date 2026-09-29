import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { StorageService } from './../src/storage/storage.service.js';
import { fakeJpeg } from './fake-jpeg.js';

// Posts do Instagram (bloco 2): envio das imagens, agendamento, lista, cancelamento e limpeza.
// O armazenamento (padrão S3) é simulado em memória.
describe('Posts do Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const DAY = 86_400_000;

  const files = new Map<string, Buffer>();
  const storage = {
    configured: true,
    put: vi.fn((key: string, body: Buffer) => {
      files.set(key, body);
      return Promise.resolve();
    }),
    get: vi.fn((key: string) => {
      const body = files.get(key);
      return body
        ? Promise.resolve(Readable.from(body))
        : Promise.reject(new Error('Arquivo não existe'));
    }),
    deleteMany: vi.fn((keys: string[]) => {
      keys.forEach((key) => files.delete(key));
      return Promise.resolve();
    }),
  };

  beforeAll(async () => {
    process.env.CRON_SECRET = 'segredo-do-cron';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const login = await api()
      .post('/auth/login')
      .send({
        email: process.env.SEED_USER_EMAIL,
        password: process.env.SEED_USER_PASSWORD,
      })
      .expect(200);
    auth = { Authorization: `Bearer ${login.body.accessToken}` };
  });

  beforeEach(async () => {
    await prisma.instagramPost.deleteMany();
    await prisma.instagramMedia.deleteMany();
    await prisma.instagramAccount.deleteMany();
    files.clear();
    vi.clearAllMocks();
    await connectAccount();
  });

  afterAll(async () => {
    await prisma.instagramPost.deleteMany();
    await prisma.instagramMedia.deleteMany();
    await prisma.instagramAccount.deleteMany();
    await app.close();
  });

  function connectAccount() {
    return prisma.instagramAccount.create({
      data: {
        igUserId: '17841',
        username: 'loja.teste',
        accessToken: 'v1.token.de.teste',
        tokenExpiresAt: new Date(Date.now() + 50 * DAY),
      },
    });
  }

  async function upload(jpeg = fakeJpeg(1080, 1350)) {
    const res = await api()
      .post('/instagram/media')
      .set(auth)
      .attach('file', jpeg, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(201);
    return res.body as {
      id: string;
      url: string;
      width: number;
      height: number;
    };
  }

  function schedule(
    mediaIds: string[],
    overrides: Record<string, unknown> = {},
  ) {
    return api()
      .post('/instagram/posts')
      .set(auth)
      .send({
        caption: 'Coleção nova! #moda',
        scheduledAt: new Date(Date.now() + DAY).toISOString(),
        mediaIds,
        ...overrides,
      });
  }

  describe('envio de imagem', () => {
    it('guarda o JPEG no armazenamento e devolve um link assinado', async () => {
      const media = await upload();
      expect(media).toMatchObject({ width: 1080, height: 1350 });
      expect(files.size).toBe(1);
      expect([...files.keys()][0]).toMatch(/^instagram\/.+\.jpg$/);

      // O app de teste não tem o prefixo /api da produção
      const image = await api()
        .get(media.url.replace(/^\/api/, ''))
        .expect(200);
      expect(image.headers['content-type']).toBe('image/jpeg');
      expect(Buffer.compare(image.body as Buffer, fakeJpeg(1080, 1350))).toBe(
        0,
      );
    });

    it('link sem token, adulterado ou de outra imagem é recusado', async () => {
      const first = await upload();
      const second = await upload();
      const token = new URL(first.url, 'http://x').searchParams.get('token')!;

      await api().get(`/instagram/media/${first.id}`).expect(403);
      await api()
        .get(`/instagram/media/${first.id}?token=${token}x`)
        .expect(403);
      await api()
        .get(`/instagram/media/${second.id}?token=${token}`)
        .expect(403);
    });

    it('recusa o que não é JPEG, proporção fora do permitido, arquivo grande ou ausente', async () => {
      await api()
        .post('/instagram/media')
        .set(auth)
        .attach('file', Buffer.from('\x89PNG\r\n\x1a\nxxxx'), 'foto.png')
        .expect(415);
      await api()
        .post('/instagram/media')
        .set(auth)
        .attach('file', fakeJpeg(1000, 2000), 'alta.jpg')
        .expect(400);
      const big = Buffer.concat([
        fakeJpeg(1080, 1080),
        Buffer.alloc(4 * 1024 * 1024),
      ]);
      await api()
        .post('/instagram/media')
        .set(auth)
        .attach('file', big, 'grande.jpg')
        .expect(413);
      await api().post('/instagram/media').set(auth).expect(400);
      expect(files.size).toBe(0);
    });
  });

  describe('agendamento', () => {
    it('agenda um carrossel na ordem enviada e mostra na lista', async () => {
      const cover = await upload(fakeJpeg(1080, 1350));
      const second = await upload(fakeJpeg(1080, 1080));

      const res = await schedule([cover.id, second.id]).expect(201);
      expect(res.body).toMatchObject({
        caption: 'Coleção nova! #moda',
        status: 'SCHEDULED',
        error: null,
      });
      expect(res.body.images.map((image: { id: string }) => image.id)).toEqual([
        cover.id,
        second.id,
      ]);

      const list = await api().get('/instagram/posts').set(auth).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].images[0].url).toContain(
        `/api/instagram/media/${cover.id}?token=`,
      );
    });

    it('lista do post mais próximo ao mais distante', async () => {
      const a = await upload();
      const b = await upload();
      await schedule([a.id], {
        caption: 'depois',
        scheduledAt: new Date(Date.now() + 3 * DAY).toISOString(),
      }).expect(201);
      await schedule([b.id], { caption: 'antes' }).expect(201);

      const list = await api().get('/instagram/posts').set(auth).expect(200);
      expect(
        list.body.map((post: { caption: string }) => post.caption),
      ).toEqual(['antes', 'depois']);
    });

    it('sem Instagram conectado (ou com conexão expirada) não agenda', async () => {
      const media = await upload();
      await prisma.instagramAccount.updateMany({
        data: { tokenInvalidAt: new Date() },
      });
      const res = await schedule([media.id]).expect(409);
      expect(res.body.message).toBe('Conecte o Instagram para agendar posts.');
    });

    it('recusa horário no passado, hashtags demais e imagens de menos ou demais', async () => {
      const media = await upload();
      await schedule([media.id], {
        scheduledAt: new Date(Date.now() - DAY).toISOString(),
      }).expect(400);
      await schedule([media.id], {
        caption: Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' '),
      }).expect(400);
      await schedule([]).expect(400);
      await schedule(
        Array.from({ length: 11 }, () => crypto.randomUUID()),
      ).expect(400);
      expect(await prisma.instagramPost.count()).toBe(0);
    });

    it('imagem inexistente ou já usada em outro post: nada é criado', async () => {
      const used = await upload();
      const free = await upload();
      await schedule([used.id]).expect(201);

      await schedule([free.id, used.id]).expect(400);
      await schedule([crypto.randomUUID()]).expect(400);
      expect(await prisma.instagramPost.count()).toBe(1);
      // A imagem livre continua livre (a transação desfez tudo)
      const stillFree = await prisma.instagramMedia.findUniqueOrThrow({
        where: { id: free.id },
      });
      expect(stillFree.postId).toBeNull();
    });
  });

  describe('cancelamento', () => {
    it('apaga o post e as imagens (no armazenamento e no banco)', async () => {
      const media = await upload();
      const post = await schedule([media.id]).expect(201);

      await api()
        .delete(`/instagram/posts/${post.body.id}`)
        .set(auth)
        .expect(204);
      expect(await prisma.instagramPost.count()).toBe(0);
      expect(await prisma.instagramMedia.count()).toBe(0);
      expect(files.size).toBe(0);
    });

    it('post já enviado ao Instagram não é cancelado', async () => {
      const media = await upload();
      const post = await schedule([media.id]).expect(201);
      await prisma.instagramPost.update({
        where: { id: post.body.id },
        data: { status: 'PUBLISHED' },
      });

      await api()
        .delete(`/instagram/posts/${post.body.id}`)
        .set(auth)
        .expect(409);
      expect(await prisma.instagramPost.count()).toBe(1);
      expect(files.size).toBe(1);
    });

    it('se o armazenamento falhar, cancela mesmo assim e deixa as imagens para o cron', async () => {
      const media = await upload();
      const post = await schedule([media.id]).expect(201);
      storage.deleteMany.mockRejectedValueOnce(new Error('armazenamento fora'));

      await api()
        .delete(`/instagram/posts/${post.body.id}`)
        .set(auth)
        .expect(204);
      expect(await prisma.instagramPost.count()).toBe(0);
      const orphan = await prisma.instagramMedia.findUniqueOrThrow({
        where: { id: media.id },
      });
      expect(orphan.postId).toBeNull();
    });

    it('post inexistente responde 404', async () => {
      await api()
        .delete(`/instagram/posts/${crypto.randomUUID()}`)
        .set(auth)
        .expect(404);
    });
  });

  it('cron diário apaga imagens soltas há mais de 24 h', async () => {
    const old = await upload();
    const recent = await upload();
    const used = await upload();
    await schedule([used.id]).expect(201);
    // Soltas há 2 dias: a imagem "old" (e a "used" não, porque está num post)
    await prisma.instagramMedia.updateMany({
      where: { id: { in: [old.id, used.id] } },
      data: { createdAt: new Date(Date.now() - 2 * DAY) },
    });

    const res = await api()
      .get('/cron/instagram-daily')
      .set('Authorization', 'Bearer segredo-do-cron')
      .expect(200);
    expect(res.body.orphanMedia).toEqual({ deleted: 1 });
    const left = await prisma.instagramMedia.findMany({ select: { id: true } });
    expect(left.map((media) => media.id).sort()).toEqual(
      [recent.id, used.id].sort(),
    );
    expect(files.size).toBe(2);
  });

  it('exige login (menos o link assinado da imagem)', async () => {
    await api().post('/instagram/media').expect(401);
    await api().get('/instagram/posts').expect(401);
    await api().post('/instagram/posts').send({}).expect(401);
    await api().delete(`/instagram/posts/${crypto.randomUUID()}`).expect(401);
  });
});
