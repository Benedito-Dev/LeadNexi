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
import { MESSAGE_ERRORS } from './../src/instagram/instagram-messages.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Direct pelo LeadNexi: só para quem já mandou direct, dentro da janela de 24 h, com os erros da
// Meta em português e sem duplicar no histórico quando o eco chega. A Meta é simulada.
describe('Mandar direct pelo LeadNexi (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const ACCOUNT = '17841400000000001';
  const SECRET = 'segredo-do-app';
  const HOUR = 3_600_000;
  const key = resolveEncryptionKey(
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
  )!;

  const meta = { sendTextMessage: vi.fn(), getMessagingProfile: vi.fn() };

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
    vi.clearAllMocks();
    meta.sendTextMessage.mockResolvedValue('mid-enviada');
    await prisma.instagramAccount.create({
      data: {
        igUserId: ACCOUNT,
        username: 'loja.teste',
        accessToken: encryptSecret('token-real', key),
        tokenExpiresAt: new Date(Date.now() + 50 * 24 * HOUR),
        messagesEnabledAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    await prisma.lead.deleteMany({ where: { instagramUserId: { not: null } } });
    await prisma.lead.deleteMany({ where: { name: 'Lead sem direct' } });
    await prisma.instagramAccount.deleteMany();
  }

  /** Lead que mandou direct há `hoursAgo` horas (null: nunca mandou) */
  async function leadFromDirect(hoursAgo: number | null = 1) {
    const stage = await prisma.stage.findFirstOrThrow();
    return prisma.lead.create({
      data: {
        name: hoursAgo === null ? 'Lead sem direct' : 'Maria Souza',
        stageId: stage.id,
        instagramUserId: hoursAgo === null ? null : 'igsid-maria',
        instagramLastMessageAt:
          hoursAgo === null ? null : new Date(Date.now() - hoursAgo * HOUR),
      },
    });
  }

  function send(leadId: string, text: string) {
    return api()
      .post(`/leads/${leadId}/instagram/messages`)
      .set(auth)
      .send({ text });
  }

  function sentMessages(leadId: string) {
    return prisma.leadActivity.findMany({
      where: { leadId, type: 'INSTAGRAM_MESSAGE_SENT' },
    });
  }

  /** Eco da Meta (assinado como a Meta assina) */
  function deliverEcho(mid: string, text: string) {
    const raw = JSON.stringify({
      object: 'instagram',
      entry: [
        {
          id: ACCOUNT,
          messaging: [
            {
              sender: { id: ACCOUNT },
              recipient: { id: 'igsid-maria' },
              timestamp: Date.now(),
              message: { mid, text, is_echo: true },
            },
          ],
        },
      ],
    });
    const signature = createHmac('sha256', SECRET).update(raw).digest('hex');
    return api()
      .post('/instagram/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', `sha256=${signature}`)
      .send(raw);
  }

  it('manda o texto para o lead e registra no histórico; o eco não duplica', async () => {
    const lead = await leadFromDirect(23);
    const res = await send(lead.id, '  Temos sim, no tamanho M!  ').expect(201);
    expect(res.body).toMatchObject({
      leadId: lead.id,
      type: 'INSTAGRAM_MESSAGE_SENT',
      text: 'Temos sim, no tamanho M!',
    });
    expect(meta.sendTextMessage).toHaveBeenCalledWith(
      'token-real',
      'igsid-maria',
      'Temos sim, no tamanho M!',
    );

    const echo = await deliverEcho('mid-enviada', 'Temos sim, no tamanho M!');
    expect(echo.body).toMatchObject({ sent: 0, ignored: 1 });
    expect(await sentMessages(lead.id)).toHaveLength(1);
  });

  it('eco que chega antes da resposta da Meta: usa o registro dele', async () => {
    const lead = await leadFromDirect();
    meta.sendTextMessage.mockImplementation(async () => {
      await deliverEcho('mid-enviada', 'Oi');
      return 'mid-enviada';
    });
    const res = await send(lead.id, 'Oi').expect(201);
    expect(res.body.type).toBe('INSTAGRAM_MESSAGE_SENT');
    expect(await sentMessages(lead.id)).toHaveLength(1);
  });

  it('lead que nunca mandou direct, ou com a janela de 24 h fechada: não manda', async () => {
    const noDirect = await leadFromDirect(null);
    const res = await send(noDirect.id, 'Oi').expect(409);
    expect(res.body.message).toBe(MESSAGE_ERRORS.noDirect);

    const old = await leadFromDirect(25);
    const closed = await send(old.id, 'Oi').expect(409);
    expect(closed.body.message).toBe(MESSAGE_ERRORS.windowClosed);
    expect(meta.sendTextMessage).not.toHaveBeenCalled();
  });

  it('mensagem vazia ou acima de 1.000 bytes (emoji ocupa 4): recusada', async () => {
    const lead = await leadFromDirect();
    expect((await send(lead.id, '   ').expect(400)).body.message).toBe(
      MESSAGE_ERRORS.empty,
    );
    // 251 emojis = 502 caracteres, mas 1.004 bytes
    expect(
      (await send(lead.id, '😀'.repeat(251)).expect(400)).body.message,
    ).toBe(MESSAGE_ERRORS.tooLong);
    expect(meta.sendTextMessage).not.toHaveBeenCalled();
  });

  it('recusas da Meta em português; nada entra no histórico', async () => {
    const lead = await leadFromDirect();
    const cases: [InstagramApiError, number, string][] = [
      [
        new InstagramApiError('outside window', 400, 10, 2534022),
        409,
        MESSAGE_ERRORS.windowClosed,
      ],
      [
        new InstagramApiError('unavailable', 400, 551),
        409,
        MESSAGE_ERRORS.unavailable,
      ],
      [
        new InstagramApiError('Sem resposta da Meta', 0),
        502,
        MESSAGE_ERRORS.transient,
      ],
      [
        new InstagramApiError('weird', 400, 100, 1234),
        502,
        'O Instagram recusou a mensagem (código 1234).',
      ],
    ];
    for (const [error, status, message] of cases) {
      meta.sendTextMessage.mockRejectedValueOnce(error);
      const res = await send(lead.id, 'Oi').expect(status);
      expect(res.body.message).toBe(message);
    }
    expect(await sentMessages(lead.id)).toHaveLength(0);
  });

  it('token recusado: pede para conectar de novo e a conta passa a "Conexão expirada"', async () => {
    const lead = await leadFromDirect();
    meta.sendTextMessage.mockRejectedValueOnce(
      new InstagramApiError('expired', 400, 190),
    );
    const res = await send(lead.id, 'Oi').expect(409);
    expect(res.body.message).toBe(MESSAGE_ERRORS.reconnect);
    const account = await api().get('/instagram/account').set(auth);
    expect(account.body.account.needsReconnect).toBe(true);

    // Sem conta válida, nem tenta
    await send(lead.id, 'Oi').expect(409);
    expect(meta.sendTextMessage).toHaveBeenCalledTimes(1);
  });

  describe('conversa', () => {
    const conversation = (leadId: string) =>
      api()
        .get(`/leads/${leadId}/instagram/conversation`)
        .set(auth)
        .expect(200);

    it('mensagens em ordem, só as do direct, e até quando dá para responder', async () => {
      const lead = await leadFromDirect(2);
      const at = (minutesAgo: number) =>
        new Date(Date.now() - minutesAgo * 60_000);
      await prisma.leadActivity.createMany({
        data: [
          {
            leadId: lead.id,
            type: 'NOTE',
            text: 'Anotação',
            createdAt: at(200),
          },
          {
            leadId: lead.id,
            type: 'INSTAGRAM_MESSAGE',
            text: 'Oi',
            createdAt: at(120),
          },
          {
            leadId: lead.id,
            type: 'INSTAGRAM_MESSAGE_SENT',
            text: 'Olá!',
            createdAt: at(60),
          },
        ],
      });

      const res = await conversation(lead.id);
      expect(res.body).toMatchObject({ canReply: true, blocked: null });
      expect(
        res.body.messages.map((m: { direction: string; text: string }) => [
          m.direction,
          m.text,
        ]),
      ).toEqual([
        ['received', 'Oi'],
        ['sent', 'Olá!'],
      ]);
      expect(new Date(res.body.replyUntil as string).getTime()).toBe(
        lead.instagramLastMessageAt!.getTime() + 24 * HOUR,
      );
    });

    it('diz por que não dá para responder: sem direct, janela fechada, conexão expirada', async () => {
      const noDirect = await leadFromDirect(null);
      expect((await conversation(noDirect.id)).body).toMatchObject({
        canReply: false,
        blocked: 'no-direct',
        replyUntil: null,
        messages: [],
      });

      const lead = await leadFromDirect(25);
      expect((await conversation(lead.id)).body).toMatchObject({
        canReply: false,
        blocked: 'window-closed',
        replyUntil: null,
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { instagramLastMessageAt: new Date() },
      });
      await prisma.instagramAccount.updateMany({
        data: { tokenInvalidAt: new Date() },
      });
      expect((await conversation(lead.id)).body).toMatchObject({
        canReply: false,
        blocked: 'reconnect',
      });
    });
  });

  it('lead inexistente: 404; sem login: 401', async () => {
    await send('7d2c5a3e-0000-4000-8000-000000000000', 'Oi').expect(404);
    await api()
      .get('/leads/7d2c5a3e-0000-4000-8000-000000000000/instagram/conversation')
      .set(auth)
      .expect(404);
    await api()
      .post('/leads/7d2c5a3e-0000-4000-8000-000000000000/instagram/messages')
      .send({ text: 'Oi' })
      .expect(401);
  });
});
