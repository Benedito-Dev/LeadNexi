import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { EvolutionClient } from './../src/whatsapp/evolution.client.js';

// WhatsApp não oficial: avisos da Evolution (webhook com token) entram no histórico do lead certo,
// achado pelo telefone; quem não é lead vira um; a resposta sai pela Evolution. A ponte é simulada.
describe('WhatsApp (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const TOKEN = 'token-do-webhook';

  const evolution = {
    configured: true,
    instance: 'leadnexi',
    webhookToken: () => TOKEN,
    findInstance: vi.fn(),
    createInstance: vi.fn(),
    setWebhook: vi.fn(),
    connect: vi.fn(),
    logout: vi.fn(),
    sendText: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EvolutionClient)
      .useValue(evolution)
      .compile();
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
    await cleanup();
    vi.clearAllMocks();
    evolution.findInstance.mockResolvedValue({ state: 'open', ownerJid: '5585900000000@s.whatsapp.net', profileName: 'Alvo' });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  /** Só o que os testes criam */
  async function cleanup() {
    await prisma.lead.deleteMany({ where: { OR: [{ whatsappJid: { not: null } }, { name: { startsWith: 'Teste WhatsApp' } }] } });
  }

  async function createLead(phone: string) {
    const stage = await prisma.stage.findFirstOrThrow({ orderBy: { position: 'asc' } });
    const list = await prisma.leadList.findFirstOrThrow();
    return prisma.lead.create({ data: { name: 'Teste WhatsApp Loja', phone, stageId: stage.id, listId: list.id } });
  }

  const message = (id: string, jid: string, text: string, fromMe = false, at = 1793210000) => ({
    event: 'messages.upsert',
    instance: 'leadnexi',
    data: { key: { remoteJid: jid, fromMe, id }, pushName: fromMe ? undefined : 'Marcos', message: { conversation: text }, messageTimestamp: at },
  });

  const deliver = (payload: unknown, token = TOKEN) => api().post(`/whatsapp/webhook?token=${token}`).send(payload);

  it('recusa aviso sem o token certo', async () => {
    await deliver(message('X1', '5585988124471@s.whatsapp.net', 'oi'), 'errado').expect(403);
  });

  it('liga a resposta ao lead pelo telefone, mesmo escrito de outro jeito e sem o 9', async () => {
    const lead = await createLead('(85) 98812-4471');
    // O WhatsApp de contas antigas usa o número sem o 9
    const res = await deliver(message('R1', '558588124471@s.whatsapp.net', 'Pode ser amanhã às 10h?')).expect(200);
    expect(res.body).toMatchObject({ received: 1, created: 0 });

    const ligado = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(ligado.whatsappJid).toBe('558588124471@s.whatsapp.net');
    const historico = await api().get(`/leads/${lead.id}/whatsapp/conversation`).set(auth).expect(200);
    expect(historico.body).toMatchObject({ canReply: true, blocked: null });
    expect(historico.body.messages).toEqual([expect.objectContaining({ direction: 'received', text: 'Pode ser amanhã às 10h?' })]);
  });

  it('o mesmo aviso duas vezes entra uma vez só', async () => {
    await createLead('85988124471');
    await deliver(message('R2', '5585988124471@s.whatsapp.net', 'oi')).expect(200);
    const res = await deliver(message('R2', '5585988124471@s.whatsapp.net', 'oi')).expect(200);
    expect(res.body).toMatchObject({ received: 0, ignored: 1 });
  });

  it('quem não é lead e escreve vira lead; mensagem do próprio número para quem não é lead não cria', async () => {
    const res = await deliver(message('N1', '5585977776666@s.whatsapp.net', 'Vi o anúncio de vocês')).expect(200);
    expect(res.body).toMatchObject({ created: 1 });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { whatsappJid: '5585977776666@s.whatsapp.net' } });
    expect(lead).toMatchObject({ name: 'Marcos', phone: '+55 85 97777-6666', source: 'WhatsApp' });

    const enviada = await deliver(message('S1', '5585911112222@s.whatsapp.net', 'oi', true)).expect(200);
    expect(enviada.body).toMatchObject({ ignored: 1, created: 0 });
  });

  it('mensagem enviada do celular entra como enviada e não conta como 1º contato', async () => {
    const lead = await createLead('85988124471');
    await deliver(message('S2', '5585988124471@s.whatsapp.net', 'Bom dia, Marcos!', true)).expect(200);
    const enviada = await prisma.leadActivity.findUniqueOrThrow({ where: { externalId: 'S2' } });
    expect(enviada).toMatchObject({ leadId: lead.id, type: 'WHATSAPP_MESSAGE_SENT', cadenceStep: 0, channel: 'whatsapp' });
  });

  it('lista as conversas pela mensagem mais recente', async () => {
    await deliver(message('A1', '5585977770001@s.whatsapp.net', 'primeira', false, 1793210000)).expect(200);
    await deliver(message('B1', '5585977770002@s.whatsapp.net', 'segunda', false, 1793220000)).expect(200);
    const res = await api().get('/whatsapp/inbox').set(auth).expect(200);
    const nossas = (res.body as { lastMessage: { text: string } }[]).filter((c) => ['primeira', 'segunda'].includes(c.lastMessage?.text));
    expect(nossas.map((c) => c.lastMessage.text)).toEqual(['segunda', 'primeira']);
  });

  it('responde pelo LeadNexi; o aviso que a Evolution manda depois não duplica', async () => {
    const lead = await createLead('85988124471');
    await deliver(message('R3', '5585988124471@s.whatsapp.net', 'Quanto custa?')).expect(200);
    evolution.sendText.mockResolvedValue({ id: 'ENV1', remoteJid: '5585988124471@s.whatsapp.net' });

    await api().post(`/leads/${lead.id}/whatsapp/messages`).set(auth).send({ text: 'A partir de R$ 600 por mês.' }).expect(201);
    expect(evolution.sendText).toHaveBeenCalledWith('5585988124471@s.whatsapp.net', 'A partir de R$ 600 por mês.');
    // A Evolution avisa a própria mensagem enviada (fromMe) com o mesmo ID
    await deliver(message('ENV1', '5585988124471@s.whatsapp.net', 'A partir de R$ 600 por mês.', true)).expect(200);

    const historico = await api().get(`/leads/${lead.id}/whatsapp/conversation`).set(auth).expect(200);
    expect(historico.body.messages.map((m: { direction: string }) => m.direction)).toEqual(['received', 'sent']);
  });

  it('com o WhatsApp desconectado, a conversa avisa e o envio é recusado', async () => {
    const lead = await createLead('85988124471');
    await deliver(message('R4', '5585988124471@s.whatsapp.net', 'oi')).expect(200);
    evolution.findInstance.mockResolvedValue({ state: 'close', ownerJid: null, profileName: null });
    const historico = await api().get(`/leads/${lead.id}/whatsapp/conversation`).set(auth).expect(200);
    expect(historico.body).toMatchObject({ canReply: false, blocked: 'disconnected' });

    const { EvolutionError } = await import('./../src/whatsapp/evolution.client.js');
    evolution.sendText.mockRejectedValue(new EvolutionError('Connection Closed', 400));
    await api().post(`/leads/${lead.id}/whatsapp/messages`).set(auth).send({ text: 'oi' }).expect(409);
  });

  it('conectar devolve o QR code e aponta o webhook com o token', async () => {
    evolution.findInstance.mockResolvedValue(null);
    evolution.connect.mockResolvedValue('data:image/png;base64,QR');
    const res = await api().post('/whatsapp/connect').set(auth).expect(200);
    expect(res.body).toEqual({ state: 'connecting', qr: 'data:image/png;base64,QR' });
    expect(evolution.createInstance).toHaveBeenCalled();
    expect(evolution.setWebhook.mock.calls[0][0]).toMatch(/\/api\/whatsapp\/webhook\?token=token-do-webhook$/);
  });
});
