import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Operação do Instagram (spec F8): calendário (período e remarcar), post como exemplo para o
// follow-up, grupos de hashtags e inbox do direct.
describe('Operação do Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const DAY = 86_400_000;
  const PREFIX = 'e2e-direct';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const login = await api()
      .post('/auth/login')
      .send({ email: process.env.SEED_USER_EMAIL, password: process.env.SEED_USER_PASSWORD })
      .expect(200);
    auth = { Authorization: `Bearer ${login.body.accessToken}` };
  });

  beforeEach(async () => {
    await prisma.instagramPost.deleteMany();
    await prisma.instagramHashtagSet.deleteMany();
    await prisma.lead.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  afterAll(async () => {
    await prisma.instagramPost.deleteMany();
    await prisma.instagramHashtagSet.deleteMany();
    await prisma.lead.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await app.close();
  });

  function post(data: { status?: 'SCHEDULED' | 'FAILED' | 'PUBLISHED'; scheduledAt: Date; publishedAt?: Date }) {
    return prisma.instagramPost.create({
      data: {
        caption: 'Post de teste',
        status: data.status ?? 'SCHEDULED',
        scheduledAt: data.scheduledAt,
        publishedAt: data.publishedAt ?? null,
        permalink: data.status === 'PUBLISHED' ? 'https://www.instagram.com/p/teste/' : null,
        ...(data.status === 'FAILED' ? { error: 'Recusado', attempts: 3 } : {}),
      },
    });
  }

  describe('calendário', () => {
    it('lista o que cai no período, pelo horário agendado ou pelo de publicação', async () => {
      const now = Date.now();
      const inside = await post({ scheduledAt: new Date(now + 2 * DAY) });
      const published = await post({
        status: 'PUBLISHED',
        scheduledAt: new Date(now - 40 * DAY),
        publishedAt: new Date(now + 3 * DAY),
      });
      await post({ scheduledAt: new Date(now + 40 * DAY) });

      const res = await api()
        .get('/instagram/posts')
        .query({ from: new Date(now).toISOString(), to: new Date(now + 7 * DAY).toISOString() })
        .set(auth)
        .expect(200);
      expect(res.body.map((item: { id: string }) => item.id).sort()).toEqual([inside.id, published.id].sort());

      await api().get('/instagram/posts').query({ from: new Date(now).toISOString() }).set(auth).expect(400);
    });

    it('remarca um agendado e devolve ao agendamento um que falhou', async () => {
      const scheduled = await post({ scheduledAt: new Date(Date.now() + DAY) });
      const failed = await post({ status: 'FAILED', scheduledAt: new Date(Date.now() - DAY) });
      const next = new Date(Date.now() + 3 * DAY).toISOString();

      const res = await api().patch(`/instagram/posts/${scheduled.id}`).send({ scheduledAt: next }).set(auth).expect(200);
      expect(res.body.scheduledAt).toBe(next);

      const retried = await api().patch(`/instagram/posts/${failed.id}`).send({ scheduledAt: next }).set(auth).expect(200);
      expect(retried.body).toMatchObject({ status: 'SCHEDULED', error: null });
      expect(await prisma.instagramPost.findUniqueOrThrow({ where: { id: failed.id } })).toMatchObject({ attempts: 0 });
    });

    it('não remarca para o passado nem um post já publicado', async () => {
      const scheduled = await post({ scheduledAt: new Date(Date.now() + DAY) });
      const published = await post({ status: 'PUBLISHED', scheduledAt: new Date(), publishedAt: new Date() });
      const future = new Date(Date.now() + DAY).toISOString();

      await api()
        .patch(`/instagram/posts/${scheduled.id}`)
        .send({ scheduledAt: new Date(Date.now() - DAY).toISOString() })
        .set(auth)
        .expect(400);
      await api().patch(`/instagram/posts/${published.id}`).send({ scheduledAt: future }).set(auth).expect(409);
    });
  });

  it('salva grupos de hashtags sem repetir e com # em todas', async () => {
    const res = await api()
      .post('/instagram/hashtag-sets')
      .send({ name: 'Celular', tags: '#celular fortaleza, #Celular #assistência_técnica' })
      .set(auth)
      .expect(201);
    expect(res.body.tags).toBe('#celular #fortaleza #assistência_técnica');

    await api().post('/instagram/hashtag-sets').send({ name: 'Vazio', tags: '# , #' }).set(auth).expect(400);
    const list = await api().get('/instagram/hashtag-sets').set(auth).expect(200);
    expect(list.body).toHaveLength(1);

    await api().delete(`/instagram/hashtag-sets/${res.body.id}`).set(auth).expect(204);
    await api().delete(`/instagram/hashtag-sets/${res.body.id}`).set(auth).expect(404);
  });

  it('inbox mostra quem mandou direct, do mais recente, com a última mensagem e lead ou não', async () => {
    const stage = await prisma.stage.findFirstOrThrow({ orderBy: [{ pipeline: { position: 'asc' } }, { position: 'asc' }] });
    const list = await prisma.leadList.findFirstOrThrow();
    const make = (name: string, igId: string, lastAt: Date, archived = false) =>
      prisma.lead.create({
        data: {
          name: `${PREFIX} ${name}`,
          stageId: stage.id,
          listId: list.id,
          archived,
          instagramUserId: `${PREFIX}-${igId}`,
          instagramLastMessageAt: lastAt,
          activities: { create: { type: 'INSTAGRAM_MESSAGE', text: `Oi, sou ${name}`, createdAt: lastAt } },
        },
      });
    await make('Antigo', '1', new Date(Date.now() - 3 * DAY), true);
    await make('Recente', '2', new Date(Date.now() - 60_000));

    const res = await api().get('/instagram/inbox').set(auth).expect(200);
    const mine = res.body.filter((item: { name: string }) => item.name.startsWith(PREFIX));
    expect(mine).toEqual([
      expect.objectContaining({
        name: `${PREFIX} Recente`,
        archived: false,
        canReply: true,
        lastMessage: expect.objectContaining({ text: 'Oi, sou Recente', direction: 'received' }),
      }),
      expect.objectContaining({ name: `${PREFIX} Antigo`, archived: true, canReply: false }),
    ]);
  });
});
