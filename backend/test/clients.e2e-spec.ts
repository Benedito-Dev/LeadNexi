import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { localDay, weekStartOf } from './../src/clients/billing.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Clientes ativos (spec F9): a ficha nasce ao mover para "Fechou"; relatórios semanais com a
// mensagem pronta; pagamentos e lembrete de renovação.
describe('Clientes ativos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const PREFIX = 'e2e-cliente';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  afterEach(() => prisma.lead.deleteMany({ where: { name: { startsWith: PREFIX } } }));
  afterAll(() => app.close());

  /** Cria um lead e move para a etapa "Fechou" pela API (como no Kanban) */
  async function closeDeal(estimatedValue?: number) {
    const stages = await prisma.stage.findMany({ orderBy: [{ pipeline: { position: 'asc' } }, { position: 'asc' }] });
    const contact = stages.find((stage) => stage.stageType === 'CONTACT')!;
    const won = stages.find((stage) => stage.stageType === 'WON' && stage.pipelineId === contact.pipelineId)!;
    const lead = await api()
      .post('/leads')
      .send({ name: `${PREFIX} Loja`, stageId: contact.id, responsibleName: 'Carlos Lima', ...(estimatedValue ? { estimatedValue } : {}) })
      .set(auth)
      .expect(201);
    await api().patch(`/leads/${lead.body.id}/move`).send({ stageId: won.id, position: 0 }).set(auth).expect(200);
    const client = await prisma.client.findUniqueOrThrow({ where: { leadId: lead.body.id } });
    return { leadId: lead.body.id as string, clientId: client.id, contact, won };
  }

  it('mover para "Fechou" cria a ficha uma vez só, com a mensalidade do valor estimado', async () => {
    const { leadId, clientId, contact, won } = await closeDeal(650);
    const res = await api().get(`/clients/${clientId}`).set(auth).expect(200);
    expect(res.body).toMatchObject({ leadId, status: 'ACTIVE', monthlyFee: '650.00', lead: { name: `${PREFIX} Loja` } });
    expect(res.body.billing).toMatchObject({ period: localDay(new Date()).slice(0, 7), daysUntil: 0, remind: true });

    // Volta e fecha de novo: continua a mesma ficha
    await api().patch(`/leads/${leadId}/move`).send({ stageId: contact.id, position: 0 }).set(auth).expect(200);
    await api().patch(`/leads/${leadId}/move`).send({ stageId: won.id, position: 0 }).set(auth).expect(200);
    expect(await prisma.client.count({ where: { leadId } })).toBe(1);
  });

  it('relatório da semana: um por semana, com custo por conversa e mensagem pronta', async () => {
    const { clientId } = await closeDeal();
    await api().put(`/clients/${clientId}/reports`).send({ weekStart: '2026-10-08', spend: 140, conversations: 40 }).set(auth).expect(200);
    await api().put(`/clients/${clientId}/reports`).send({ weekStart: '2026-10-16', spend: 140, conversations: 50 }).set(auth).expect(200);
    // Mesma semana (qualquer dia dela) substitui
    const res = await api()
      .put(`/clients/${clientId}/reports`)
      .send({ weekStart: '2026-10-12', spend: 140, conversations: 56 })
      .set(auth)
      .expect(200);

    expect(res.body.reports).toHaveLength(2);
    expect(res.body.reports[0]).toMatchObject({ weekStart: '2026-10-12', spend: '140.00', conversations: 56, costPerConversation: 2.5 });
    expect(res.body.reports[0].message).toContain('Oi, Carlos!');
    expect(res.body.reports[0].message).toContain('mais barata que na semana anterior');
    expect(res.body.totals).toEqual({ spend: '280.00', conversations: 96, costPerConversation: 2.92 });

    await api().put(`/clients/${clientId}/reports`).send({ weekStart: '12/10/2026', spend: 1, conversations: 1 }).set(auth).expect(400);
  });

  it('pagamento do mês empurra a cobrança para o mês seguinte', async () => {
    const { clientId } = await closeDeal();
    const period = localDay(new Date()).slice(0, 7);
    const res = await api().post(`/clients/${clientId}/payments`).send({ amount: 500, period }).set(auth).expect(201);
    expect(res.body.payments).toEqual([expect.objectContaining({ amount: '500.00', period })]);
    expect(res.body.billing.period).not.toBe(period);
    expect(res.body.billing.remind).toBe(false);

    const removed = await api().delete(`/clients/${clientId}/payments/${res.body.payments[0].id}`).set(auth).expect(200);
    expect(removed.body.billing.period).toBe(period);
  });

  it('lembretes: renovação vencendo e relatório da semana passada pendente', async () => {
    const { clientId } = await closeDeal();
    // Começou há 3 semanas: já deve o relatório da semana passada
    await prisma.client.update({ where: { id: clientId }, data: { startDate: new Date(Date.now() - 21 * 86_400_000) } });
    let res = await api().get('/clients/reminders').set(auth).expect(200);
    const lastWeek = weekStartOf(localDay(new Date(Date.now() - 7 * 86_400_000)));
    expect(res.body.pendingReports).toEqual(expect.arrayContaining([expect.objectContaining({ id: clientId, pendingWeek: lastWeek })]));
    expect(res.body.renewals).toEqual(expect.arrayContaining([expect.objectContaining({ id: clientId })]));

    await api().put(`/clients/${clientId}/reports`).send({ weekStart: lastWeek, spend: 70, conversations: 20 }).set(auth).expect(200);
    await api().patch(`/clients/${clientId}`).send({ status: 'PAUSED' }).set(auth).expect(200);
    res = await api().get('/clients/reminders').set(auth).expect(200);
    expect(res.body.pendingReports.map((client: { id: string }) => client.id)).not.toContain(clientId);
    expect(res.body.renewals.map((client: { id: string }) => client.id)).not.toContain(clientId);
  });

  it('atualiza o checklist de entrada e a verba; recusa dia de cobrança fora de 1 a 28', async () => {
    const { clientId } = await closeDeal();
    const res = await api()
      .patch(`/clients/${clientId}`)
      .send({ partnerAccess: true, dailyAdBudget: 20, billingDay: 10 })
      .set(auth)
      .expect(200);
    expect(res.body).toMatchObject({ partnerAccess: true, whatsappGreeting: false, dailyAdBudget: '20.00', billingDay: 10 });
    await api().patch(`/clients/${clientId}`).send({ billingDay: 31 }).set(auth).expect(400);
  });
});
