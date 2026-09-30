import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import {
  encryptSecret,
  resolveEncryptionKey,
} from './../src/common/crypto/secret-box.js';
import { InstagramApiClient } from './../src/instagram/instagram-api.client.js';
import { UNKNOWN_CONTACT } from './../src/instagram/instagram-inbox.service.js';
import { AVATAR_REFRESH_MS } from './../src/leads/lead-avatar.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { StorageService } from './../src/storage/storage.service.js';
import { fakeJpeg } from './fake-jpeg.js';

// Direct vira lead: avisos da Meta (webhook) conferidos pela assinatura, lead novo na primeira
// etapa do funil, mensagens no histórico sem repetir e foto de perfil guardada. A Meta e o
// armazenamento são simulados.
describe('Direct do Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  let verifyToken: string;
  const api = () => request(app.getHttpServer());
  const ACCOUNT = '17841400000000001';
  const SECRET = 'segredo-do-app';
  const key = resolveEncryptionKey(
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
  )!;

  const meta = { getMessagingProfile: vi.fn(), downloadImage: vi.fn() };
  const PHOTO = fakeJpeg(320, 320);

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
    process.env.INSTAGRAM_APP_ID = 'app-de-teste';
    process.env.INSTAGRAM_APP_SECRET = SECRET;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InstagramApiClient)
      .useValue(meta)
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();
    // Como no main.ts: a assinatura é conferida sobre o corpo original
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
    const settings = await api().get('/instagram/settings').set(auth);
    verifyToken = settings.body.webhookVerifyToken as string;
  });

  beforeEach(async () => {
    await cleanup();
    files.clear();
    vi.clearAllMocks();
    meta.getMessagingProfile.mockReset();
    meta.getMessagingProfile.mockResolvedValue({
      name: 'Maria Souza',
      username: 'maria.souza',
      profilePictureUrl: 'https://cdn.exemplo.test/maria.jpg',
    });
    meta.downloadImage.mockReset();
    meta.downloadImage.mockResolvedValue(PHOTO);
    await prisma.instagramAccount.create({
      data: {
        igUserId: ACCOUNT,
        username: 'loja.teste',
        accessToken: encryptSecret('token-real', key),
        tokenExpiresAt: new Date(Date.now() + 50 * 86_400_000),
        messagesEnabledAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  /** Só o que os testes criam: leads que vieram do direct e a conta do Instagram */
  async function cleanup() {
    await prisma.lead.deleteMany({ where: { instagramUserId: { not: null } } });
    await prisma.lead.deleteMany({ where: { name: 'Lead com Instagram' } });
    await prisma.instagramAccount.deleteMany();
    await prisma.instagramAppSettings.deleteMany();
  }

  function firstStage() {
    return prisma.stage.findFirstOrThrow({
      orderBy: [
        { pipeline: { position: 'asc' } },
        { pipeline: { createdAt: 'asc' } },
        { position: 'asc' },
      ],
    });
  }

  /** Aviso da Meta assinado com a chave secreta do app (como a Meta faz) */
  function deliver(payload: unknown, secret = SECRET) {
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    return api()
      .post('/instagram/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', `sha256=${signature}`)
      .send(raw);
  }

  function dm(
    message: Record<string, unknown>,
    options: { sender?: string; account?: string; timestamp?: number } = {},
  ) {
    return {
      object: 'instagram',
      entry: [
        {
          id: options.account ?? ACCOUNT,
          time: Date.now(),
          messaging: [
            {
              sender: { id: options.sender ?? 'igsid-maria' },
              recipient: { id: options.account ?? ACCOUNT },
              timestamp: options.timestamp ?? Date.now(),
              message,
            },
          ],
        },
      ],
    };
  }

  function activitiesOf(leadId: string) {
    return prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  describe('cadastro do webhook na Meta', () => {
    it('devolve o desafio quando o token confere', async () => {
      expect(verifyToken).toMatch(/^[\w-]{32}$/);
      const res = await api()
        .get('/instagram/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': '1158201444',
        })
        .expect(200);
      expect(res.text).toBe('1158201444');
      expect(res.headers['content-type']).toMatch(/^text\/plain/);
    });

    it('recusa token errado ou pedido que não é de cadastro', async () => {
      await api()
        .get('/instagram/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'errado',
          'hub.challenge': '1',
        })
        .expect(403);
      await api()
        .get('/instagram/webhook')
        .query({
          'hub.mode': 'unsubscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': '1',
        })
        .expect(403);
    });
  });

  describe('assinatura', () => {
    it('sem assinatura ou assinado com outra chave: recusado, nada criado', async () => {
      await api()
        .post('/instagram/webhook')
        .send(dm({ mid: 'm1', text: 'Oi' }))
        .expect(401);
      await deliver(dm({ mid: 'm1', text: 'Oi' }), 'outra-chave').expect(401);
      expect(
        await prisma.lead.count({ where: { instagramUserId: { not: null } } }),
      ).toBe(0);
    });

    it('usa a chave salva pela tela quando ela existe', async () => {
      await prisma.instagramAppSettings.create({
        data: {
          id: 1,
          appId: '123456',
          appSecret: encryptSecret('chave-da-tela-123', key),
        },
      });
      await deliver(dm({ mid: 'm1', text: 'Oi' })).expect(401);
      await deliver(dm({ mid: 'm1', text: 'Oi' }), 'chave-da-tela-123').expect(
        200,
      );
    });
  });

  describe('mensagens', () => {
    it('direct de quem não é lead cria o lead na primeira etapa, com @ e a mensagem', async () => {
      const sentAt = Date.now() - 60_000;
      const res = await deliver(
        dm(
          { mid: 'm1', text: '  Oi! Quanto custa o vestido?  ' },
          { timestamp: sentAt },
        ),
      ).expect(200);
      expect(res.body).toEqual({ created: 1, messages: 1, ignored: 0 });
      expect(meta.getMessagingProfile).toHaveBeenCalledWith(
        'igsid-maria',
        'token-real',
      );

      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-maria' },
      });
      expect(lead).toMatchObject({
        name: 'Maria Souza',
        instagramUsername: 'maria.souza',
        source: 'Instagram',
        stageId: (await firstStage()).id,
      });
      const activities = await activitiesOf(lead.id);
      expect(activities.map((a) => a.type)).toEqual([
        'CREATED',
        'INSTAGRAM_MESSAGE',
      ]);
      expect(activities[1]).toMatchObject({
        text: 'Oi! Quanto custa o vestido?',
        externalId: 'm1',
      });
      expect(activities[1].createdAt.getTime()).toBe(sentAt);

      // O lead aparece na busca pelo @
      const found = await api()
        .get('/leads')
        .query({ search: '@maria.souza', page: 1, limit: 10 })
        .set(auth)
        .expect(200);
      expect(found.body.data.map((l: { id: string }) => l.id)).toContain(
        lead.id,
      );
    });

    it('mensagem nova de quem já é lead só entra no histórico; a mesma mensagem não repete', async () => {
      await deliver(dm({ mid: 'm1', text: 'Oi' })).expect(200);
      const second = await deliver(
        dm({ mid: 'm2', text: 'Tem tamanho M?' }),
      ).expect(200);
      expect(second.body).toEqual({ created: 0, messages: 1, ignored: 0 });
      const repeated = await deliver(
        dm({ mid: 'm2', text: 'Tem tamanho M?' }),
      ).expect(200);
      expect(repeated.body).toEqual({ created: 0, messages: 0, ignored: 1 });

      expect(
        await prisma.lead.count({ where: { instagramUserId: 'igsid-maria' } }),
      ).toBe(1);
      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-maria' },
      });
      const messages = (await activitiesOf(lead.id)).filter(
        (a) => a.type === 'INSTAGRAM_MESSAGE',
      );
      expect(messages.map((m) => m.text)).toEqual(['Oi', 'Tem tamanho M?']);
      expect(meta.getMessagingProfile).toHaveBeenCalledTimes(1);
    });

    it('duas mensagens de uma pessoa nova no mesmo aviso: um lead, duas mensagens', async () => {
      const payload = dm({ mid: 'm1', text: 'Oi' });
      payload.entry[0].messaging.push({
        ...payload.entry[0].messaging[0],
        message: { mid: 'm2', text: 'Tudo bem?' },
      });
      const res = await deliver(payload).expect(200);
      expect(res.body).toEqual({ created: 1, messages: 2, ignored: 0 });
    });

    it('ignora eco (mensagem da própria loja), apagada, sem ID e de outra conta', async () => {
      const res = await deliver({
        object: 'instagram',
        entry: [
          {
            id: ACCOUNT,
            messaging: [
              {
                sender: { id: ACCOUNT },
                recipient: { id: 'igsid-maria' },
                message: { mid: 'e1', text: 'Oi', is_echo: true },
              },
              {
                sender: { id: 'igsid-maria' },
                message: { mid: 'd1', is_deleted: true },
              },
              { sender: { id: 'igsid-maria' }, message: { text: 'sem mid' } },
              { sender: { id: 'igsid-maria' }, read: { mid: 'x' } },
            ],
          },
          {
            id: 'outra-conta',
            messaging: [
              {
                sender: { id: 'igsid-joao' },
                message: { mid: 'o1', text: 'Oi' },
              },
            ],
          },
        ],
      }).expect(200);
      expect(res.body).toEqual({ created: 0, messages: 0, ignored: 5 });
      expect(
        await prisma.lead.count({ where: { instagramUserId: { not: null } } }),
      ).toBe(0);
    });

    it('anexo sem texto vira uma frase no histórico', async () => {
      await deliver(
        dm({ mid: 'a1', attachments: [{ type: 'image', payload: {} }] }),
      ).expect(200);
      await deliver(
        dm({ mid: 'a2', attachments: [{ type: 'story_mention' }] }),
      ).expect(200);
      await deliver(
        dm({ mid: 'a3', attachments: [{ type: 'novo_tipo' }] }),
      ).expect(200);
      const lead = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-maria' },
      });
      const texts = (await activitiesOf(lead.id))
        .filter((a) => a.type === 'INSTAGRAM_MESSAGE')
        .map((a) => a.text);
      expect(texts).toEqual([
        'Enviou uma imagem',
        'Mencionou você nos stories',
        'Enviou um anexo',
      ]);
    });

    it('sem o perfil (a Meta não respondeu), o lead nasce com nome genérico; só com o @, usa o @', async () => {
      meta.getMessagingProfile.mockRejectedValueOnce(new Error('fora do ar'));
      await deliver(
        dm({ mid: 'p1', text: 'Oi' }, { sender: 'igsid-a' }),
      ).expect(200);
      meta.getMessagingProfile.mockResolvedValueOnce({
        name: null,
        username: 'joao.b',
      });
      await deliver(
        dm({ mid: 'p2', text: 'Oi' }, { sender: 'igsid-b' }),
      ).expect(200);

      const a = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-a' },
      });
      const b = await prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-b' },
      });
      expect(a).toMatchObject({
        name: UNKNOWN_CONTACT,
        instagramUsername: null,
      });
      expect(b).toMatchObject({ name: '@joao.b', instagramUsername: 'joao.b' });
    });

    it('aceita o formato do botão "Testar" do painel da Meta (changes)', async () => {
      const res = await deliver({
        object: 'instagram',
        entry: [
          {
            id: ACCOUNT,
            time: Date.now(),
            changes: [
              {
                field: 'messages',
                value: {
                  sender: { id: 'igsid-teste' },
                  recipient: { id: ACCOUNT },
                  timestamp: String(Date.now()),
                  message: { mid: 't1', text: 'mensagem de teste' },
                },
              },
            ],
          },
        ],
      }).expect(200);
      expect(res.body).toEqual({ created: 1, messages: 1, ignored: 0 });
    });

    it('sem conta conectada, nada entra', async () => {
      await prisma.instagramAccount.deleteMany();
      const res = await deliver(dm({ mid: 'm1', text: 'Oi' })).expect(200);
      expect(res.body).toEqual({ created: 0, messages: 0, ignored: 1 });
    });
  });

  describe('foto de perfil', () => {
    async function mariaLead() {
      return prisma.lead.findUniqueOrThrow({
        where: { instagramUserId: 'igsid-maria' },
      });
    }

    it('lead novo ganha uma cópia da foto, servida pelo LeadNexi', async () => {
      await deliver(dm({ mid: 'f1', text: 'Oi' })).expect(200);
      expect(meta.downloadImage).toHaveBeenCalledWith(
        'https://cdn.exemplo.test/maria.jpg',
      );
      const lead = await mariaLead();
      expect(lead.avatarId).toMatch(/^[0-9a-f-]{36}$/);
      expect(lead.avatarUpdatedAt).not.toBeNull();
      expect([...files.keys()]).toEqual([`leads/avatars/${lead.avatarId}.jpg`]);

      const image = await api()
        .get(`/leads/avatars/${lead.avatarId}`)
        .expect(200);
      expect(image.headers['content-type']).toBe('image/jpeg');
      expect(image.headers['cache-control']).toContain('immutable');
      expect(Buffer.compare(image.body as Buffer, PHOTO)).toBe(0);

      // Lista de leads traz o ID da foto para o card
      const list = await api()
        .get('/leads')
        .query({ search: '@maria.souza', page: 1, limit: 10 })
        .set(auth);
      expect(list.body.data[0].avatarId).toBe(lead.avatarId);
    });

    it('confere a foto de novo só depois de uma semana, e apaga a antiga', async () => {
      await deliver(dm({ mid: 'f1', text: 'Oi' })).expect(200);
      await deliver(dm({ mid: 'f2', text: 'Tudo bem?' })).expect(200);
      expect(meta.getMessagingProfile).toHaveBeenCalledTimes(1);
      const first = await mariaLead();

      await prisma.lead.update({
        where: { id: first.id },
        data: {
          avatarUpdatedAt: new Date(Date.now() - AVATAR_REFRESH_MS - 60_000),
        },
      });
      await deliver(dm({ mid: 'f3', text: 'Oi de novo' })).expect(200);
      expect(meta.getMessagingProfile).toHaveBeenCalledTimes(2);
      const second = await mariaLead();
      expect(second.avatarId).not.toBe(first.avatarId);
      expect([...files.keys()]).toEqual([
        `leads/avatars/${second.avatarId}.jpg`,
      ]);
    });

    it('foto que não baixa ou não é JPEG: o lead entra sem foto e tenta na próxima mensagem', async () => {
      meta.downloadImage.mockRejectedValueOnce(new Error('404'));
      await deliver(dm({ mid: 'f1', text: 'Oi' })).expect(200);
      expect(await mariaLead()).toMatchObject({
        avatarId: null,
        avatarUpdatedAt: null,
      });

      meta.downloadImage.mockResolvedValueOnce(
        Buffer.from('<html>não é imagem</html>'),
      );
      await deliver(dm({ mid: 'f2', text: 'Oi?' })).expect(200);
      expect(await mariaLead()).toMatchObject({
        avatarId: null,
        avatarUpdatedAt: null,
      });

      await deliver(dm({ mid: 'f3', text: 'Alô' })).expect(200);
      expect((await mariaLead()).avatarId).not.toBeNull();
      expect(files.size).toBe(1);
    });

    it('perfil sem foto: sem avatar (iniciais), e só confere de novo na semana seguinte', async () => {
      meta.getMessagingProfile.mockResolvedValue({
        name: 'Maria Souza',
        username: 'maria.souza',
        profilePictureUrl: null,
      });
      await deliver(dm({ mid: 'f1', text: 'Oi' })).expect(200);
      const lead = await mariaLead();
      expect(lead.avatarId).toBeNull();
      expect(lead.avatarUpdatedAt).not.toBeNull();
      expect(meta.downloadImage).not.toHaveBeenCalled();
    });

    it('excluir o lead apaga a foto; foto inexistente responde 404', async () => {
      await deliver(dm({ mid: 'f1', text: 'Oi' })).expect(200);
      const lead = await mariaLead();
      await api().delete(`/leads/${lead.id}`).set(auth).expect(204);
      expect(files.size).toBe(0);
      await api().get(`/leads/avatars/${lead.avatarId}`).expect(404);
      await api().get('/leads/avatars/nao-e-uuid').expect(400);
    });
  });

  it('@ do Instagram no cadastro do lead: guardado sem o @ e em minúsculas', async () => {
    const stage = await firstStage();
    const created = await api()
      .post('/leads')
      .set(auth)
      .send({
        name: 'Lead com Instagram',
        stageId: stage.id,
        instagramUsername: ' @Maria.Souza ',
      })
      .expect(201);
    expect(created.body.instagramUsername).toBe('maria.souza');

    await api()
      .patch(`/leads/${created.body.id}`)
      .set(auth)
      .send({ instagramUsername: 'maria souza!' })
      .expect(400);
    const cleared = await api()
      .patch(`/leads/${created.body.id}`)
      .set(auth)
      .send({ instagramUsername: null })
      .expect(200);
    expect(cleared.body.instagramUsername).toBeNull();
  });
});
