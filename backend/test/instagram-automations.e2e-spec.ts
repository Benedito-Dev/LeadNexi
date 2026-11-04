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
    sendTextMessage: vi.fn(),
    sendButtonMessage: vi.fn(),
    followsAccount: vi.fn(),
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
    meta.sendTextMessage.mockImplementation(() => Promise.resolve(`mid-${++n}`));
    meta.sendButtonMessage.mockImplementation(() =>
      Promise.resolve(`mid-${++n}`),
    );
    meta.followsAccount.mockResolvedValue(true);
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
    await prisma.client.deleteMany({ where: { lead: { instagramUserId: { not: null } } } });
    await prisma.lead.deleteMany({ where: { instagramUserId: { not: null } } });
    await prisma.leadList.deleteMany({ where: { name: 'Lista da automação' } });
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
        undefined,
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

  describe('botão e "siga para receber"', () => {
    /** Toque no botão (postback), no formato da Meta */
    function tap(payload: string, sender = 'igsid-ana') {
      return {
        object: 'instagram',
        entry: [
          {
            id: ACCOUNT,
            time: Date.now(),
            messaging: [
              {
                sender: { id: sender },
                recipient: { id: ACCOUNT },
                timestamp: Date.now(),
                postback: { mid: `pb-${Math.random()}`, title: 'Quero o link', payload },
              },
            ],
          },
        ],
      };
    }

    const withButton = {
      message: 'Toque no botão para receber',
      buttonLabel: 'Quero o link',
      deliveryMessage: 'Aqui está: https://exemplo.test/catalogo',
    };

    async function commentAndGetPayload() {
      await deliver(comment('quero'));
      const button = meta.sendPrivateReply.mock.calls[0][3] as {
        title: string;
        payload: string;
      };
      return button;
    }

    it('a primeira mensagem leva o botão; o toque entrega uma vez só', async () => {
      const automation = await createAutomation(withButton);
      const button = await commentAndGetPayload();
      expect(button.title).toBe('Quero o link');
      expect(button.payload).toMatch(/^automacao:/);

      await deliver(tap(button.payload));
      await deliver(tap(button.payload));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
      expect(meta.sendTextMessage).toHaveBeenCalledWith(
        'token-real',
        'igsid-ana',
        'Aqui está: https://exemplo.test/catalogo',
      );

      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-ana' },
        include: { activities: { orderBy: { createdAt: 'asc' } } },
      });
      expect(lead.instagramLastMessageAt).not.toBeNull();
      expect(
        lead.activities.filter((a) => a.type === 'INSTAGRAM_MESSAGE_SENT').map((a) => a.text),
      ).toEqual(['Toque no botão para receber', 'Aqui está: https://exemplo.test/catalogo']);

      const list = await api().get('/instagram/automations').set(auth).expect(200);
      expect(list.body[0]).toMatchObject({ sent: 1, delivered: 1 });
      const runs = await api()
        .get(`/instagram/automations/${automation.body.id}/runs`)
        .set(auth)
        .expect(200);
      expect(runs.body[0].deliveredAt).not.toBeNull();
    });

    it('quem não segue recebe o pedido com o botão; depois de seguir, recebe a entrega', async () => {
      await createAutomation({
        ...withButton,
        requireFollow: true,
        notFollowingMessage: 'Me segue e toca de novo!',
      });
      const button = await commentAndGetPayload();

      meta.followsAccount.mockResolvedValue(false);
      await deliver(tap(button.payload));
      expect(meta.sendButtonMessage).toHaveBeenCalledWith(
        'token-real',
        'igsid-ana',
        'Me segue e toca de novo!',
        button,
      );
      expect(meta.sendTextMessage).not.toHaveBeenCalled();

      meta.followsAccount.mockResolvedValue(true);
      await deliver(tap(button.payload));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('se a Meta não disser se segue, entrega mesmo assim', async () => {
      await createAutomation({ ...withButton, requireFollow: true });
      const button = await commentAndGetPayload();
      meta.followsAccount.mockRejectedValue(new Error('fora do ar'));
      await deliver(tap(button.payload));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('toque de outra pessoa ou de botão desconhecido não entrega', async () => {
      await createAutomation(withButton);
      const button = await commentAndGetPayload();
      await deliver(tap(button.payload, 'igsid-outra'));
      await deliver(tap('automacao:00000000-0000-4000-8000-000000000000'));
      await deliver(tap('outra-coisa'));
      expect(meta.sendTextMessage).not.toHaveBeenCalled();
    });

    it('entrega recusada pela Meta pode sair num toque seguinte', async () => {
      await createAutomation(withButton);
      const button = await commentAndGetPayload();
      meta.sendTextMessage.mockRejectedValueOnce(new Error('fora do ar'));
      await deliver(tap(button.payload));
      await deliver(tap(button.payload));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(2);
      const run = await prisma.instagramAutomationRun.findFirstOrThrow();
      expect(run.deliveredAt).not.toBeNull();
      expect(run.error).toBeNull();
    });

    it('recusa botão sem entrega, "siga" sem botão e texto longo com botão', async () => {
      const base = { name: 'x', message: 'Oi', mediaIds: [], keywords: [] };
      const bad = async (body: Record<string, unknown>, pattern: RegExp) => {
        const res = await api().post('/instagram/automations').set(auth).send({ ...base, ...body }).expect(400);
        expect(JSON.stringify(res.body.message)).toMatch(pattern);
      };
      await bad({ buttonLabel: 'Quero' }, /tocar no botão/);
      await bad({ requireFollow: true }, /precisa ter um botão/);
      await bad({ ...withButton, message: 'a'.repeat(641) }, /640/);
      await bad({ buttonLabel: 'a'.repeat(21), deliveryMessage: 'x' }, /buttonLabel/);

      // Editar tirando a entrega de uma com botão também é recusado
      const ok = await createAutomation(withButton);
      await api()
        .patch(`/instagram/automations/${ok.body.id}`)
        .set(auth)
        .send({ deliveryMessage: '' })
        .expect(400);
      // Tirar o botão junto libera
      await api()
        .patch(`/instagram/automations/${ok.body.id}`)
        .set(auth)
        .send({ buttonLabel: null, deliveryMessage: null })
        .expect(200);
    });
  });

  describe('story e direct', () => {
    /** Mensagem recebida no direct, no formato da Meta */
    function dm(
      message: Record<string, unknown>,
      options: { mid?: string; from?: string } = {},
    ) {
      return {
        object: 'instagram',
        entry: [
          {
            id: ACCOUNT,
            time: Date.now(),
            messaging: [
              {
                sender: { id: options.from ?? 'igsid-ana' },
                recipient: { id: ACCOUNT },
                timestamp: Date.now(),
                message: { mid: options.mid ?? 'dm-1', ...message },
              },
            ],
          },
        ],
      };
    }
    const storyReply = (text: string, mid = 'dm-1') =>
      dm({ text, reply_to: { story: { id: 'story-1', url: 'https://cdn.test/s' } } }, { mid });
    const mention = (mid = 'dm-1') =>
      dm({ attachments: [{ type: 'story_mention', payload: { url: 'https://cdn.test/m' } }] }, { mid });

    beforeEach(() => {
      meta.getMessagingProfile.mockResolvedValue({
        name: 'Ana Lima',
        username: 'ana.lima',
        profilePictureUrl: null,
      });
    });

    it('resposta a story responde no direct da pessoa, que vira lead pelo inbox', async () => {
      const automation = await createAutomation({
        trigger: 'STORY_REPLY',
        keywords: [],
        mediaIds: ['post-1'],
        publicReplies: ['não vale aqui'],
      });
      // Post e resposta pública não valem para story
      expect(automation.body).toMatchObject({ mediaIds: [], publicReplies: [] });

      await deliver(storyReply('que lindo!'));
      expect(meta.sendTextMessage).toHaveBeenCalledWith(
        'token-real',
        'igsid-ana',
        'Oi! Aqui está o link: https://exemplo.test',
      );
      expect(meta.sendPrivateReply).not.toHaveBeenCalled();
      expect(meta.replyToComment).not.toHaveBeenCalled();

      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-ana' },
        include: { activities: { orderBy: { createdAt: 'asc' } } },
      });
      expect(lead.activities.map((a) => [a.type, a.via])).toEqual([
        ['CREATED', null],
        ['INSTAGRAM_MESSAGE', null],
        ['INSTAGRAM_MESSAGE_SENT', 'automacao'],
      ]);
      const [run] = await prisma.instagramAutomationRun.findMany();
      expect(run).toMatchObject({
        mediaId: 'story-1',
        username: 'ana.lima',
        commentText: 'que lindo!',
        status: 'SENT',
      });
    });

    it('menção no story dispara a automação de menção', async () => {
      await createAutomation({ trigger: 'STORY_MENTION', keywords: ['quero'] });
      await deliver(mention());
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
      const automation = await prisma.instagramAutomation.findFirstOrThrow();
      expect(automation.keywords).toEqual([]);
    });

    it('palavra no direct dispara; sem a palavra, não', async () => {
      await createAutomation({ trigger: 'DM_KEYWORD', keywords: ['preço'], mediaIds: [] });
      await deliver(dm({ text: 'oi, tudo bem?' }, { mid: 'dm-1' }));
      expect(meta.sendTextMessage).not.toHaveBeenCalled();
      await deliver(dm({ text: 'qual o PRECO?' }, { mid: 'dm-2' }));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('no direct, a mesma pessoa recebe uma vez por dia', async () => {
      await createAutomation({ trigger: 'DM_KEYWORD', keywords: ['preço'], mediaIds: [] });
      await deliver(dm({ text: 'preço' }, { mid: 'dm-1' }));
      await deliver(dm({ text: 'preço?' }, { mid: 'dm-2' }));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
      // Passado um dia, recebe de novo
      await prisma.instagramAutomationRun.updateMany({
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });
      await deliver(dm({ text: 'preço' }, { mid: 'dm-3' }));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(2);
    });

    it('resposta a story sem automação de story cai na de palavra no direct', async () => {
      await createAutomation({ trigger: 'DM_KEYWORD', keywords: ['quero'], mediaIds: [] });
      await deliver(storyReply('quero!'));
      expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('com botão, vai como mensagem com botão e o toque entrega', async () => {
      await createAutomation({
        trigger: 'DM_KEYWORD',
        keywords: ['quero'],
        mediaIds: [],
        message: 'Toque para receber',
        buttonLabel: 'Quero',
        deliveryMessage: 'Aqui: https://exemplo.test',
      });
      await deliver(dm({ text: 'quero' }));
      const [, , , button] = meta.sendButtonMessage.mock.calls[0] as [
        string,
        string,
        string,
        { payload: string },
      ];
      await deliver({
        object: 'instagram',
        entry: [
          {
            id: ACCOUNT,
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'igsid-ana' },
                recipient: { id: ACCOUNT },
                timestamp: Date.now(),
                postback: { mid: 'pb-1', title: 'Quero', payload: button.payload },
              },
            ],
          },
        ],
      });
      expect(meta.sendTextMessage).toHaveBeenCalledWith(
        'token-real',
        'igsid-ana',
        'Aqui: https://exemplo.test',
      );
    });

    it('a própria mensagem da conta (eco) e a automação de comentário não disparam no direct', async () => {
      await createAutomation({ mediaIds: [], keywords: [] });
      await createAutomation({ trigger: 'DM_KEYWORD', keywords: ['quero'], mediaIds: [] });
      await deliver(dm({ text: 'quero', is_echo: true }));
      await deliver(dm({ text: 'quero' }, { mid: 'dm-9', from: ACCOUNT }));
      expect(meta.sendTextMessage).not.toHaveBeenCalled();
      expect(meta.sendPrivateReply).not.toHaveBeenCalled();
    });

    it('palavra no direct sem palavra é recusada', async () => {
      const res = await api()
        .post('/instagram/automations')
        .set(auth)
        .send({ name: 'x', trigger: 'DM_KEYWORD', message: 'Oi', keywords: [] })
        .expect(400);
      expect(res.body.message).toMatch(/pelo menos uma palavra/);
    });
  });

  describe('no CRM e placar', () => {
    const stage = (name: string) => prisma.stage.findFirstOrThrow({ where: { name } });

    it('leva o lead novo para a etapa e a lista, com "via automação" no histórico', async () => {
      const respondeu = await stage('Respondeu');
      const list = await prisma.leadList.create({ data: { name: 'Lista da automação' } });
      await createAutomation({ stageId: respondeu.id, listId: list.id });
      await deliver(comment('quero'));

      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-ana' },
        include: { activities: true },
      });
      expect(lead).toMatchObject({ stageId: respondeu.id, listId: list.id });
      expect(lead.activities.find((a) => a.type === 'STAGE_CHANGED')).toMatchObject({
        toStage: 'Respondeu',
        via: 'automacao',
      });
    });

    it('nunca volta um lead de etapa nem tira quem fechou', async () => {
      const enviada = await stage('Mensagem enviada');
      const proposta = await stage('Proposta enviada');
      const fechou = await stage('Fechou');
      await createAutomation({ stageId: enviada.id });

      // Já está mais à frente: fica onde está
      await deliver(comment('quero', { id: 'c-1', from: 'igsid-ana' }));
      await prisma.lead.update({ where: { instagramUserId: 'igsid-ana' }, data: { stageId: proposta.id } });
      await createAutomation({ stageId: enviada.id, mediaIds: ['post-2'] });
      await deliver(comment('quero', { id: 'c-2', media: 'post-2', from: 'igsid-ana' }));
      expect((await prisma.lead.findUniqueOrThrow({ where: { instagramUserId: 'igsid-ana' } })).stageId).toBe(proposta.id);

      // Fechou: também fica
      await prisma.lead.update({ where: { instagramUserId: 'igsid-ana' }, data: { stageId: fechou.id } });
      await createAutomation({ stageId: enviada.id, mediaIds: ['post-3'] });
      await deliver(comment('quero', { id: 'c-3', media: 'post-3', from: 'igsid-ana' }));
      expect((await prisma.lead.findUniqueOrThrow({ where: { instagramUserId: 'igsid-ana' } })).stageId).toBe(fechou.id);
    });

    it('lead que já está noutra lista não muda de lista', async () => {
      const list = await prisma.leadList.create({ data: { name: 'Lista da automação' } });
      const outra = await prisma.leadList.create({ data: { name: 'Lista da automação' } });
      await createAutomation({ listId: list.id });
      await deliver(comment('quero', { id: 'c-1' }));
      await prisma.lead.update({ where: { instagramUserId: 'igsid-ana' }, data: { listId: outra.id } });
      await createAutomation({ listId: list.id, mediaIds: ['post-2'] });
      await deliver(comment('quero', { id: 'c-2', media: 'post-2' }));
      expect((await prisma.lead.findUniqueOrThrow({ where: { instagramUserId: 'igsid-ana' } })).listId).toBe(outra.id);
    });

    it('recusa etapa de fechou e etapa ou lista que não existe', async () => {
      const fechou = await stage('Fechou');
      const base = { name: 'x', message: 'Oi', mediaIds: [], keywords: [] };
      await api().post('/instagram/automations').set(auth).send({ ...base, stageId: fechou.id }).expect(400);
      await api()
        .post('/instagram/automations')
        .set(auth)
        .send({ ...base, stageId: '00000000-0000-4000-8000-00000000ffff' })
        .expect(400);
      await api()
        .post('/instagram/automations')
        .set(auth)
        .send({ ...base, listId: '00000000-0000-4000-8000-00000000ffff' })
        .expect(400);
    });

    it('placar: pessoas alcançadas e quantas fecharam', async () => {
      await createAutomation({ mediaIds: [], keywords: [] });
      await deliver(comment('quero', { id: 'c-1', from: 'igsid-ana', username: 'ana' }));
      await deliver(comment('quero', { id: 'c-2', from: 'igsid-bia', username: 'bia' }));
      await prisma.lead.update({ where: { instagramUserId: 'igsid-bia' }, data: { wonAt: new Date() } });
      const list = await api().get('/instagram/automations').set(auth).expect(200);
      expect(list.body[0]).toMatchObject({ sent: 2, leads: 2, won: 1 });
    });
  });
});
