import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
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
import { PrismaService } from './../src/prisma/prisma.service.js';

// Automações: comentário num post vira mensagem no direct (resposta privada da Meta), quem
// comentou vira lead e a mensagem entra no histórico "via automação". A Meta é simulada.
describe('Automações do Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const ACCOUNT = '17841400000000001';
  const SECRET = 'segredo-do-app';
  const key = resolveEncryptionKey(
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
  )!;

  const meta = {
    sendPrivateReply: vi.fn(),
    replyToComment: vi.fn(),
    getMessagingProfile: vi.fn(),
    downloadImage: vi.fn(),
  };

  beforeAll(async () => {
    process.env.INSTAGRAM_APP_ID = 'app-de-teste';
    process.env.INSTAGRAM_APP_SECRET = SECRET;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InstagramApiClient)
      .useValue(meta)
      .compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
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
    await cleanup();
    Object.values(meta).forEach((fn) => fn.mockReset());
    let n = 0;
    meta.sendPrivateReply.mockImplementation(() =>
      Promise.resolve(`mid-${++n}`),
    );
    meta.replyToComment.mockResolvedValue('resposta-1');
    await prisma.instagramAccount.create({
      data: {
        igUserId: ACCOUNT,
        username: 'loja.teste',
        accessToken: encryptSecret('token-real', key),
        tokenExpiresAt: new Date(Date.now() + 50 * 86_400_000),
        messagesEnabledAt: new Date(),
        commentsEnabledAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    await prisma.instagramAutomation.deleteMany();
    await prisma.lead.deleteMany({ where: { instagramUserId: { not: null } } });
    await prisma.instagramAccount.deleteMany();
    await prisma.instagramAppSettings.deleteMany();
  }

  function deliver(payload: unknown) {
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha256', SECRET).update(raw).digest('hex');
    return api()
      .post('/instagram/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', `sha256=${signature}`)
      .send(raw)
      .expect(200);
  }

  /** Aviso de comentário, no formato da Meta */
  function comment(
    text: string,
    options: { id?: string; media?: string; from?: string; username?: string } = {},
  ) {
    return {
      object: 'instagram',
      entry: [
        {
          id: ACCOUNT,
          time: Date.now(),
          changes: [
            {
              field: 'comments',
              value: {
                id: options.id ?? 'c-1',
                text,
                from: {
                  id: options.from ?? 'igsid-ana',
                  username: options.username ?? 'ana.lima',
                },
                media: { id: options.media ?? 'post-1', media_product_type: 'FEED' },
              },
            },
          ],
        },
      ],
    };
  }

  function createAutomation(body: Record<string, unknown> = {}) {
    return api()
      .post('/instagram/automations')
      .set(auth)
      .send({
        name: 'Link do catálogo',
        mediaIds: ['post-1'],
        keywords: ['quero'],
        message: 'Oi! Aqui está o link: https://exemplo.test',
        ...body,
      })
      .expect(201);
  }

  describe('cadastro', () => {
    it('cria, lista, pausa e apaga, limpando espaço e repetidos', async () => {
      const created = await createAutomation({
        keywords: [' quero ', 'quero', '', 'link'],
        publicReplies: ['Te mandei no direct!'],
      });
      expect(created.body).toMatchObject({
        active: true,
        keywords: ['quero', 'link'],
        publicReplies: ['Te mandei no direct!'],
      });

      const paused = await api()
        .patch(`/instagram/automations/${created.body.id}`)
        .set(auth)
        .send({ active: false })
        .expect(200);
      expect(paused.body.active).toBe(false);

      const list = await api().get('/instagram/automations').set(auth).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ sent: 0, failed: 0, lastSentAt: null });

      await api()
        .delete(`/instagram/automations/${created.body.id}`)
        .set(auth)
        .expect(204);
      await api()
        .delete(`/instagram/automations/${created.body.id}`)
        .set(auth)
        .expect(404);
    });

    it('recusa sem mensagem ou sem nome', async () => {
      await api()
        .post('/instagram/automations')
        .set(auth)
        .send({ name: 'x', message: '   ' })
        .expect(400);
      await api()
        .post('/instagram/automations')
        .set(auth)
        .send({ name: '', message: 'Oi' })
        .expect(400);
    });

    it('sem login: 401', async () => {
      await api().get('/instagram/automations').expect(401);
    });
  });

  describe('comentário dispara', () => {
    it('manda o direct, cria o lead e registra no histórico via automação', async () => {
      const automation = await createAutomation({
        publicReplies: ['Te mandei no direct!'],
      });
      await deliver(comment('QUERO!'));

      expect(meta.sendPrivateReply).toHaveBeenCalledWith(
        'token-real',
        'c-1',
        'Oi! Aqui está o link: https://exemplo.test',
      );
      expect(meta.replyToComment).toHaveBeenCalledWith(
        'token-real',
        'c-1',
        'Te mandei no direct!',
      );

      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-ana' },
        include: { activities: { orderBy: { createdAt: 'asc' } } },
      });
      expect(lead).toMatchObject({
        name: '@ana.lima',
        instagramUsername: 'ana.lima',
        source: 'Instagram',
      });
      expect(lead.activities.map((a) => a.type)).toEqual([
        'CREATED',
        'INSTAGRAM_MESSAGE_SENT',
      ]);
      expect(lead.activities[1]).toMatchObject({
        externalId: 'mid-1',
        via: 'automacao',
      });

      const runs = await api()
        .get(`/instagram/automations/${automation.body.id}/runs`)
        .set(auth)
        .expect(200);
      expect(runs.body).toEqual([
        expect.objectContaining({
          username: 'ana.lima',
          commentText: 'QUERO!',
          leadId: lead.id,
          status: 'SENT',
          error: null,
        }),
      ]);
      const list = await api().get('/instagram/automations').set(auth).expect(200);
      expect(list.body[0].sent).toBe(1);
    });

    it('o mesmo comentário avisado duas vezes manda uma vez só', async () => {
      await createAutomation();
      await deliver(comment('quero'));
      await deliver(comment('quero'));
      expect(meta.sendPrivateReply).toHaveBeenCalledTimes(1);
    });

    it('a mesma pessoa comentando de novo no post não recebe de novo', async () => {
      const automation = await createAutomation();
      await deliver(comment('quero', { id: 'c-1' }));
      await deliver(comment('quero muito', { id: 'c-2' }));
      expect(meta.sendPrivateReply).toHaveBeenCalledTimes(1);
      const runs = await prisma.instagramAutomationRun.findMany({
        where: { automationId: automation.body.id },
      });
      expect(runs.map((r) => r.status).sort()).toEqual(['SENT', 'SKIPPED']);
    });

    it('lead que já existe recebe no histórico dele, sem lead novo', async () => {
      await createAutomation();
      await deliver(comment('quero', { id: 'c-1' }));
      await deliver(comment('quero', { id: 'c-2', media: 'post-1', from: 'igsid-ana' }));
      await createAutomation({ mediaIds: ['post-2'] });
      await deliver(comment('quero', { id: 'c-3', media: 'post-2' }));
      expect(meta.sendPrivateReply).toHaveBeenCalledTimes(2);
      expect(
        await prisma.lead.count({ where: { instagramUserId: 'igsid-ana' } }),
      ).toBe(1);
    });

    it('não dispara sem a palavra, em outro post, pausada ou no comentário da própria conta', async () => {
      const automation = await createAutomation();
      await deliver(comment('que lindo', { id: 'c-1' }));
      await deliver(comment('quero', { id: 'c-2', media: 'post-9' }));
      await deliver(comment('quero', { id: 'c-3', from: ACCOUNT }));
      await api()
        .patch(`/instagram/automations/${automation.body.id}`)
        .set(auth)
        .send({ active: false })
        .expect(200);
      await deliver(comment('quero', { id: 'c-4' }));
      expect(meta.sendPrivateReply).not.toHaveBeenCalled();
      expect(await prisma.lead.count({ where: { instagramUserId: { not: null } } })).toBe(0);
    });

    it('sem post nem palavra, qualquer comentário dispara', async () => {
      await createAutomation({ mediaIds: [], keywords: [] });
      await deliver(comment('que lindo', { media: 'post-7' }));
      expect(meta.sendPrivateReply).toHaveBeenCalledTimes(1);
    });
  });

  describe('falhas', () => {
    it('Meta recusa: registra o motivo e não põe mensagem no histórico', async () => {
      const automation = await createAutomation();
      meta.sendPrivateReply.mockRejectedValue(
        new InstagramApiError('(#10) permission', 400, 10),
      );
      await deliver(comment('quero'));

      const [run] = await prisma.instagramAutomationRun.findMany({
        where: { automationId: automation.body.id },
      });
      expect(run.status).toBe('FAILED');
      expect(run.error).toMatch(/permissão de comentários/);
      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-ana' },
        include: { activities: true },
      });
      expect(lead.activities.map((a) => a.type)).toEqual(['CREATED']);
      const list = await api().get('/instagram/automations').set(auth).expect(200);
      expect(list.body[0]).toMatchObject({ sent: 0, failed: 1 });
    });

    it('token recusado marca a conta para reconectar', async () => {
      await createAutomation();
      meta.sendPrivateReply.mockRejectedValue(
        new InstagramApiError('Invalid OAuth', 400, 190),
      );
      await deliver(comment('quero'));
      const account = await prisma.instagramAccount.findFirstOrThrow();
      expect(account.tokenInvalidAt).not.toBeNull();
    });

    it('resposta pública falha: o direct conta como enviado, com o aviso', async () => {
      const automation = await createAutomation({ publicReplies: ['Te chamei!'] });
      meta.replyToComment.mockRejectedValue(new Error('fora do ar'));
      await deliver(comment('quero'));
      const [run] = await prisma.instagramAutomationRun.findMany({
        where: { automationId: automation.body.id },
      });
      expect(run.status).toBe('SENT');
      expect(run.error).toMatch(/resposta pública/);
    });
  });

  it('o eco da Meta depois do envio não duplica a mensagem no histórico', async () => {
    await createAutomation();
    await deliver(comment('quero'));
    await deliver({
      object: 'instagram',
      entry: [
        {
          id: ACCOUNT,
          time: Date.now(),
          messaging: [
            {
              sender: { id: ACCOUNT },
              recipient: { id: 'igsid-ana' },
              timestamp: Date.now(),
              message: { mid: 'mid-1', text: 'Oi! Aqui está o link', is_echo: true },
            },
          ],
        },
      ],
    });
    const lead = await prisma.lead.findUniqueOrThrow({
      where: { instagramUserId: 'igsid-ana' },
      include: { activities: true },
    });
    expect(
      lead.activities.filter((a) => a.type === 'INSTAGRAM_MESSAGE_SENT'),
    ).toHaveLength(1);
  });
});
