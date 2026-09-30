import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import {
  encryptSecret,
  resolveEncryptionKey,
} from './../src/common/crypto/secret-box.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './../src/instagram/instagram-api.client.js';
import {
  InstagramPublisherService,
  MESSAGES,
  RETRY_DELAY_MS,
  STUCK_MS,
} from './../src/instagram/instagram-publisher.service.js';
import { MAX_ALARM_DELAY_MS } from './../src/instagram/publish-alarm.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { StorageService } from './../src/storage/storage.service.js';
import { fakeJpeg } from './fake-jpeg.js';

// Publicação no Instagram (bloco 3): "Publicar agora", "Tentar de novo" e o despertador (QStash)
// que publica na hora marcada. A Meta, o armazenamento e o QStash são simulados.
describe('Publicação no Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const DAY = 86_400_000;
  const ORIGIN = /^http:\/\/127\.0\.0\.1:\d+$/;

  const files = new Map<string, Buffer>();
  const storage = {
    configured: true,
    put: vi.fn((key: string, body: Buffer) => {
      files.set(key, body);
      return Promise.resolve();
    }),
    get: vi.fn((key: string) =>
      Promise.resolve(Readable.from(files.get(key) ?? Buffer.alloc(0))),
    ),
    deleteMany: vi.fn(() => Promise.resolve()),
  };

  // Meta simulada: cada contêiner leva o ID da imagem (dá para conferir a ordem do carrossel)
  const meta = {
    createImageContainer: vi.fn(),
    createCarouselContainer: vi.fn(),
    getContainerStatus: vi.fn(),
    publishContainer: vi.fn(),
    getPermalink: vi.fn(),
  };
  const qstash = vi.fn<typeof fetch>();
  const QSTASH_ENV = {
    QSTASH_TOKEN: 'token-do-qstash',
    QSTASH_URL: 'https://qstash.test',
    QSTASH_CURRENT_SIGNING_KEY: 'chave-atual',
    QSTASH_NEXT_SIGNING_KEY: 'chave-seguinte',
  };

  beforeAll(async () => {
    process.env.CRON_SECRET = 'segredo-do-cron';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(storage)
      .overrideProvider(InstagramApiClient)
      .useValue(meta)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    // Sem espera entre as conferências do contêiner
    app.get(InstagramPublisherService).sleep = () => Promise.resolve();
    vi.stubGlobal('fetch', qstash);

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
    Object.assign(process.env, QSTASH_ENV);

    meta.createImageContainer.mockImplementation(
      (_user: string, _token: string, image: { imageUrl: string }) =>
        Promise.resolve(`c-${mediaIdOf(image.imageUrl)}`),
    );
    meta.createCarouselContainer.mockResolvedValue('carrossel');
    meta.getContainerStatus.mockResolvedValue('FINISHED');
    meta.publishContainer.mockResolvedValue('midia-1');
    meta.getPermalink.mockResolvedValue('https://www.instagram.com/p/abc/');
    qstash.mockImplementation(() =>
      Promise.resolve(new Response('{}', { status: 201 })),
    );

    const key = resolveEncryptionKey(
      process.env.TOKEN_ENCRYPTION_KEY,
      process.env.JWT_SECRET,
    )!;
    await prisma.instagramAccount.create({
      data: {
        igUserId: '17841',
        username: 'loja.teste',
        accessToken: encryptSecret('token-real', key),
        tokenExpiresAt: new Date(Date.now() + 50 * DAY),
      },
    });
  });

  afterAll(async () => {
    Object.keys(QSTASH_ENV).forEach((name) => delete process.env[name]);
    vi.unstubAllGlobals();
    await prisma.instagramPost.deleteMany();
    await prisma.instagramMedia.deleteMany();
    await prisma.instagramAccount.deleteMany();
    await app.close();
  });

  function mediaIdOf(imageUrl: string) {
    return new URL(imageUrl).pathname.split('/').at(-1)!;
  }

  async function upload() {
    const res = await api()
      .post('/instagram/media')
      .set(auth)
      .attach('file', fakeJpeg(1080, 1350), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    return res.body as { id: string };
  }

  async function uploadMany(count: number) {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) ids.push((await upload()).id);
    return ids;
  }

  function createPost(body: Record<string, unknown>) {
    return api()
      .post('/instagram/posts')
      .set(auth)
      .send({ caption: 'Coleção nova! #moda', ...body });
  }

  async function publishNow(mediaIds: string[], caption?: string) {
    const res = await createPost({
      mediaIds,
      publishNow: true,
      ...(caption === undefined ? {} : { caption }),
    }).expect(201);
    return res.body as {
      id: string;
      status: string;
      error: string | null;
      permalink: string | null;
      publishedAt: string | null;
    };
  }

  /** Agenda e já deixa vencido (como se a hora tivesse chegado) */
  async function duePost(minutesAgo = 1) {
    const res = await createPost({
      mediaIds: [(await upload()).id],
      scheduledAt: new Date(Date.now() + DAY).toISOString(),
    }).expect(201);
    await prisma.instagramPost.update({
      where: { id: res.body.id as string },
      data: { scheduledAt: new Date(Date.now() - minutesAgo * 60_000) },
    });
    return res.body.id as string;
  }

  /** Chamada do despertador, assinada como o QStash assina */
  function alarmCall(options: { key?: string; path?: string } = {}) {
    const signature = jwt.sign(
      {},
      {
        secret: options.key ?? 'chave-atual',
        issuer: 'Upstash',
        subject: `https://leadnexi.test${options.path ?? '/api/cron/instagram-publish'}`,
        expiresIn: '5m',
      },
    );
    return api()
      .post('/cron/instagram-publish')
      .set('Upstash-Signature', signature);
  }

  function lastAlarm() {
    const [url, init] = qstash.mock.calls.at(-1)!;
    const headers = init?.headers as Record<string, string>;
    return {
      url: url instanceof Request ? url.url : url.toString(),
      method: init?.method,
      authorization: headers.Authorization,
      notBefore: Number(headers['Upstash-Not-Before']) * 1000,
    };
  }

  describe('publicar agora', () => {
    it('foto única: publica na hora com o link da imagem, a legenda e o token da conta', async () => {
      const [mediaId] = await uploadMany(1);
      const post = await publishNow([mediaId], 'Oi #moda');

      expect(post).toMatchObject({
        status: 'PUBLISHED',
        error: null,
        permalink: 'https://www.instagram.com/p/abc/',
      });
      expect(post.publishedAt).toBeTruthy();

      expect(meta.createImageContainer).toHaveBeenCalledTimes(1);
      const [igUserId, token, image] = meta.createImageContainer.mock
        .calls[0] as [string, string, { imageUrl: string; caption: string }];
      expect(igUserId).toBe('17841');
      expect(token).toBe('token-real');
      expect(image.caption).toBe('Oi #moda');
      const imageUrl = new URL(image.imageUrl);
      expect(imageUrl.origin).toMatch(ORIGIN);
      expect(imageUrl.pathname).toBe(`/api/instagram/media/${mediaId}`);
      expect(meta.publishContainer).toHaveBeenCalledWith(
        '17841',
        'token-real',
        `c-${mediaId}`,
      );

      // O link entregue à Meta abre a imagem (o app de teste não tem o prefixo /api)
      const download = await api()
        .get(`${imageUrl.pathname.replace(/^\/api/, '')}${imageUrl.search}`)
        .expect(200);
      expect(download.headers['content-type']).toBe('image/jpeg');

      const saved = await prisma.instagramPost.findUniqueOrThrow({
        where: { id: post.id },
      });
      expect(saved).toMatchObject({ igMediaId: 'midia-1', attempts: 0 });
    });

    it('carrossel: itens sem legenda, na ordem, e a legenda no carrossel', async () => {
      const ids = await uploadMany(3);
      const post = await publishNow(ids, 'Legenda do carrossel');
      expect(post.status).toBe('PUBLISHED');

      expect(meta.createImageContainer).toHaveBeenCalledTimes(3);
      for (const call of meta.createImageContainer.mock.calls) {
        expect(call[2]).toMatchObject({ carouselItem: true });
        expect(call[2]).not.toHaveProperty('caption');
      }
      expect(meta.createCarouselContainer).toHaveBeenCalledWith(
        '17841',
        'token-real',
        {
          children: ids.map((id) => `c-${id}`),
          caption: 'Legenda do carrossel',
        },
      );
      expect(meta.publishContainer).toHaveBeenCalledWith(
        '17841',
        'token-real',
        'carrossel',
      );
    });

    it('espera a Meta processar as imagens antes de publicar', async () => {
      meta.getContainerStatus
        .mockResolvedValueOnce('IN_PROGRESS')
        .mockResolvedValueOnce('IN_PROGRESS');
      const post = await publishNow(await uploadMany(1));
      expect(post.status).toBe('PUBLISHED');
      expect(meta.getContainerStatus).toHaveBeenCalledTimes(3);
    });

    it('recusa da Meta: "Falhou" com o motivo em português; "Tentar de novo" publica', async () => {
      meta.publishContainer.mockRejectedValueOnce(
        new InstagramApiError('Aspect ratio', 400, 36003, 2207009),
      );
      const failed = await publishNow(await uploadMany(1));
      expect(failed).toMatchObject({
        status: 'FAILED',
        error:
          'O Instagram recusou a proporção de uma imagem (precisa ficar entre 4:5 e 1,91:1).',
        permalink: null,
      });

      const retried = await api()
        .post(`/instagram/posts/${failed.id}/publish`)
        .set(auth)
        .expect(200);
      expect(retried.body).toMatchObject({ status: 'PUBLISHED', error: null });
    });

    it('recusa desconhecida mostra o código; falha passageira no "Publicar agora" já vira "Falhou"', async () => {
      meta.publishContainer.mockRejectedValueOnce(
        new InstagramApiError('Unknown media type', 400, 100, 2207023),
      );
      expect((await publishNow(await uploadMany(1))).error).toBe(
        'O Instagram recusou a publicação (código 2207023).',
      );

      meta.publishContainer.mockRejectedValueOnce(
        new InstagramApiError('Sem resposta da Meta', 0),
      );
      expect(await publishNow(await uploadMany(1))).toMatchObject({
        status: 'FAILED',
        error: MESSAGES.transient,
      });
    });

    it('token recusado pela Meta: "Falhou" e a conta passa a pedir reconexão', async () => {
      meta.createImageContainer.mockRejectedValueOnce(
        new InstagramApiError('Error validating access token', 400, 190),
      );
      expect(await publishNow(await uploadMany(1))).toMatchObject({
        status: 'FAILED',
        error: MESSAGES.reconnect,
      });
      const account = await api().get('/instagram/account').set(auth);
      expect(account.body.account.needsReconnect).toBe(true);
    });

    it('agendado pode sair antes; publicado, publicando ou inexistente não', async () => {
      const res = await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: new Date(Date.now() + DAY).toISOString(),
      }).expect(201);
      const published = await api()
        .post(`/instagram/posts/${res.body.id}/publish`)
        .set(auth)
        .expect(200);
      expect(published.body.status).toBe('PUBLISHED');

      await api()
        .post(`/instagram/posts/${res.body.id}/publish`)
        .set(auth)
        .expect(409);

      await prisma.instagramPost.update({
        where: { id: res.body.id as string },
        data: { status: 'PUBLISHING' },
      });
      await api()
        .post(`/instagram/posts/${res.body.id}/publish`)
        .set(auth)
        .expect(409);

      await api()
        .post('/instagram/posts/7d2c5a3e-0000-4000-8000-000000000000/publish')
        .set(auth)
        .expect(404);
    });

    it('sem Instagram conectado não publica', async () => {
      const mediaIds = await uploadMany(1);
      await prisma.instagramAccount.deleteMany();
      const res = await createPost({ mediaIds, publishNow: true }).expect(409);
      expect(res.body.message).toBe('Conecte o Instagram para publicar.');
      expect(meta.createImageContainer).not.toHaveBeenCalled();
    });
  });

  describe('despertador (QStash)', () => {
    it('agendar arma o despertador para a hora do post', async () => {
      const scheduledAt = new Date(Date.now() + DAY);
      const res = await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: scheduledAt.toISOString(),
      }).expect(201);

      expect(qstash).toHaveBeenCalledTimes(1);
      const alarm = lastAlarm();
      expect(alarm.method).toBe('POST');
      expect(alarm.authorization).toBe('Bearer token-do-qstash');
      expect(alarm.url).toMatch(
        /^https:\/\/qstash\.test\/v2\/publish\/http:\/\/127\.0\.0\.1:\d+\/api\/cron\/instagram-publish$/,
      );
      expect(alarm.notBefore).toBe(
        Math.ceil(scheduledAt.getTime() / 1000) * 1000,
      );
      expect(res.body.alarmFailed).toBe(false);

      const status = await api().get('/instagram/publishing').set(auth);
      expect(status.body).toEqual({ automatic: true });
    });

    it('post a mais de 7 dias: o despertador toca antes (limite do QStash)', async () => {
      await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: new Date(Date.now() + 10 * DAY).toISOString(),
      }).expect(201);
      const expected = Date.now() + MAX_ALARM_DELAY_MS;
      expect(Math.abs(lastAlarm().notBefore - expected)).toBeLessThan(10_000);
    });

    it('sem QStash configurado (ou fora do ar), o post é agendado mesmo assim', async () => {
      delete process.env.QSTASH_TOKEN;
      await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: new Date(Date.now() + DAY).toISOString(),
      }).expect(201);
      expect(qstash).not.toHaveBeenCalled();
      const status = await api().get('/instagram/publishing').set(auth);
      expect(status.body).toEqual({ automatic: false });

      process.env.QSTASH_TOKEN = QSTASH_ENV.QSTASH_TOKEN;
      qstash.mockResolvedValueOnce(new Response('erro', { status: 500 }));
      const failed = await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: new Date(Date.now() + DAY).toISOString(),
      }).expect(201);
      expect(failed.body).toMatchObject({
        status: 'SCHEDULED',
        alarmFailed: true,
      });
      expect(await prisma.instagramPost.count()).toBe(2);
    });

    it('na hora: publica os vencidos, deixa os futuros e arma o próximo', async () => {
      const due = await duePost();
      const futureAt = new Date(Date.now() + 2 * DAY);
      const future = await createPost({
        mediaIds: await uploadMany(1),
        scheduledAt: futureAt.toISOString(),
      }).expect(201);

      const res = await alarmCall().expect(200);
      expect(res.body).toEqual({
        published: 1,
        retrying: 0,
        failed: 0,
        interrupted: 0,
      });
      const posts = await prisma.instagramPost.findMany();
      expect(posts.find((p) => p.id === due)?.status).toBe('PUBLISHED');
      expect(posts.find((p) => p.id === future.body.id)?.status).toBe(
        'SCHEDULED',
      );
      expect(lastAlarm().notBefore).toBe(
        Math.ceil(futureAt.getTime() / 1000) * 1000,
      );
    });

    it('aceita a chave de assinatura seguinte e o CRON_SECRET; recusa o resto', async () => {
      await alarmCall({ key: 'chave-seguinte' }).expect(200);
      await api()
        .post('/cron/instagram-publish')
        .set('Authorization', 'Bearer segredo-do-cron')
        .expect(200);

      await alarmCall({ key: 'chave-errada' }).expect(401);
      await alarmCall({ path: '/api/cron/instagram-daily' }).expect(401);
      await api().post('/cron/instagram-publish').expect(401);
      await api()
        .post('/cron/instagram-publish')
        .set('Authorization', 'Bearer errado')
        .expect(401);
    });

    it('falha passageira: tenta de novo em 1 minuto, até 3 vezes', async () => {
      const id = await duePost();
      meta.publishContainer.mockRejectedValue(
        new InstagramApiError('Service temporarily unavailable', 503, 2),
      );

      for (const attempt of [1, 2]) {
        const res = await alarmCall().expect(200);
        expect(res.body).toMatchObject({ retrying: 1, failed: 0 });
        const post = await prisma.instagramPost.findUniqueOrThrow({
          where: { id },
        });
        expect(post).toMatchObject({ status: 'SCHEDULED', attempts: attempt });
        const expected = Date.now() + RETRY_DELAY_MS;
        expect(Math.abs(lastAlarm().notBefore - expected)).toBeLessThan(5_000);
        // Na lista, segue "Agendado", sem motivo de falha
        const list = await api().get('/instagram/posts').set(auth);
        expect(list.body[0]).toMatchObject({
          status: 'SCHEDULED',
          error: null,
        });
      }

      const last = await alarmCall().expect(200);
      expect(last.body).toMatchObject({ retrying: 0, failed: 1 });
      expect(
        await prisma.instagramPost.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({
        status: 'FAILED',
        attempts: 3,
        error: MESSAGES.transient,
      });
    });

    it('publicação interrompida vira "Falhou" com aviso para conferir no Instagram', async () => {
      const stuck = await duePost();
      const recent = await duePost();
      await prisma.instagramPost.update({
        where: { id: stuck },
        data: {
          status: 'PUBLISHING',
          publishingStartedAt: new Date(Date.now() - STUCK_MS - 60_000),
        },
      });
      await prisma.instagramPost.update({
        where: { id: recent },
        data: {
          status: 'PUBLISHING',
          publishingStartedAt: new Date(Date.now() - 60_000),
        },
      });

      const res = await alarmCall().expect(200);
      expect(res.body).toMatchObject({ interrupted: 1, published: 0 });
      const posts = await prisma.instagramPost.findMany();
      expect(posts.find((p) => p.id === stuck)).toMatchObject({
        status: 'FAILED',
        error: MESSAGES.interrupted,
      });
      expect(posts.find((p) => p.id === recent)?.status).toBe('PUBLISHING');
    });

    it('cron diário fecha interrompidas e remarca o despertador', async () => {
      await duePost(30);
      const res = await api()
        .get('/cron/instagram-daily')
        .set('Authorization', 'Bearer segredo-do-cron')
        .expect(200);
      expect(res.body.publishing).toEqual({ interrupted: 0, armed: true });
      expect(qstash).toHaveBeenCalled();
      const expected = Date.now() + RETRY_DELAY_MS;
      expect(Math.abs(lastAlarm().notBefore - expected)).toBeLessThan(5_000);
    });
  });

  it('lista: primeiro os que não saíram, depois os publicados (mais recente primeiro)', async () => {
    const scheduled = await createPost({
      mediaIds: await uploadMany(1),
      scheduledAt: new Date(Date.now() + DAY).toISOString(),
    }).expect(201);
    const first = await publishNow(await uploadMany(1));
    const second = await publishNow(await uploadMany(1));

    const list = await api().get('/instagram/posts').set(auth).expect(200);
    expect(list.body.map((post: { id: string }) => post.id)).toEqual([
      scheduled.body.id,
      second.id,
      first.id,
    ]);
    expect(list.body[1]).toMatchObject({
      status: 'PUBLISHED',
      permalink: 'https://www.instagram.com/p/abc/',
    });
  });

  it('exige login (o despertador usa a assinatura, não o login)', async () => {
    await api().get('/instagram/publishing').expect(401);
    await api()
      .post('/instagram/posts/7d2c5a3e-0000-4000-8000-000000000000/publish')
      .expect(401);
  });
});
