import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Importação de planilha: cada linha conferida, quem já está no CRM (ou repetido na planilha) fica
// de fora, "dryRun" só confere, e a gravação é tudo de uma vez, no fim de cada etapa.
// Os leads de teste têm nome começando com "Importado (e2e)" e são apagados no fim.
describe('Importar leads de planilha (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  let stages: { id: string; name: string }[];
  const PREFIX = 'Importado (e2e)';
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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

    const pipelines = await api().get('/pipelines').set(auth).expect(200);
    const pipeline = (
      pipelines.body as { stages: { id: string; name: string }[] }[]
    ).find((p) => p.stages.length >= 2);
    if (!pipeline) throw new Error('Precisa de um pipeline com 2 etapas');
    stages = pipeline.stages;
  });

  const cleanup = () =>
    prisma.lead.deleteMany({ where: { name: { startsWith: PREFIX } } });
  beforeEach(cleanup);
  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const importLeads = (leads: Record<string, unknown>[], dryRun = false) =>
    api()
      .post('/leads/import')
      .set(auth)
      .send({ leads, ...(dryRun ? { dryRun } : {}) })
      .expect(200);

  it('grava as linhas no fim de cada etapa, com origem "Planilha" e "Criado" no histórico', async () => {
    const before = await prisma.lead.count({
      where: { stageId: stages[1].id },
    });
    const res = await importLeads([
      {
        name: `${PREFIX} Aki Pets`,
        instagramUsername: 'https://www.instagram.com/AkiPets/',
        notes: 'Bairro: Messejana · Prioridade: Alta',
        stageId: stages[0].id,
      },
      {
        name: `  ${PREFIX}   Pet Prático `,
        phone: '(85) 99999-0001',
        email: 'Contato@PetPratico.com',
        estimatedValue: 1500.555,
        stageId: stages[1].id,
      },
    ]);
    expect(res.body).toMatchObject({ accepted: 2, skipped: 0 });
    expect(res.body.rows).toEqual([
      { index: 0, status: 'created' },
      { index: 1, status: 'created' },
    ]);

    const aki = await prisma.lead.findFirstOrThrow({
      where: { name: `${PREFIX} Aki Pets` },
      include: { activities: true },
    });
    expect(aki).toMatchObject({
      instagramUsername: 'akipets',
      notes: 'Bairro: Messejana · Prioridade: Alta',
      source: 'Planilha',
    });
    expect(aki.activities).toMatchObject([
      { type: 'CREATED', text: 'Planilha', toStage: stages[0].name },
    ]);
    const pet = await prisma.lead.findFirstOrThrow({
      where: { name: `${PREFIX} Pet Prático` },
    });
    expect(pet).toMatchObject({
      email: 'contato@petpratico.com',
      position: before,
    });
    expect(pet.estimatedValue?.toString()).toBe('1500.56');
  });

  it('dryRun só confere: diz o que entraria e não grava nada', async () => {
    const res = await importLeads(
      [{ name: `${PREFIX} Livi`, stageId: stages[0].id }],
      true,
    );
    expect(res.body).toMatchObject({
      accepted: 1,
      rows: [{ index: 0, status: 'ready' }],
    });
    expect(
      await prisma.lead.count({ where: { name: { startsWith: PREFIX } } }),
    ).toBe(0);
  });

  it('quem já está no CRM (mesmo @, telefone ou nome) fica de fora', async () => {
    await importLeads([
      {
        name: `${PREFIX} Nola`,
        instagramUsername: 'nolapet',
        stageId: stages[0].id,
      },
      {
        name: `${PREFIX} Megan`,
        phone: '+55 85 98888-0000',
        stageId: stages[0].id,
      },
      { name: `${PREFIX} Via Pet`, stageId: stages[0].id },
    ]);

    const res = await importLeads([
      {
        name: `${PREFIX} Outro nome`,
        instagramUsername: '@NolaPet',
        stageId: stages[0].id,
      },
      {
        name: `${PREFIX} Outro 2`,
        phone: '85988880000',
        stageId: stages[0].id,
      },
      { name: `${PREFIX.toUpperCase()} VIA PET`, stageId: stages[0].id },
      { name: `${PREFIX} Novo`, stageId: stages[0].id },
    ]);
    expect(res.body).toMatchObject({ accepted: 1, skipped: 3 });
    expect(res.body.rows).toEqual([
      {
        index: 0,
        status: 'duplicate',
        reason: 'Já está no CRM (mesmo @ do Instagram)',
      },
      {
        index: 1,
        status: 'duplicate',
        reason: 'Já está no CRM (mesmo telefone)',
      },
      { index: 2, status: 'duplicate', reason: 'Já está no CRM (mesmo nome)' },
      { index: 3, status: 'created' },
    ]);
  });

  it('linha repetida na planilha: a primeira entra, a segunda não', async () => {
    const res = await importLeads([
      { name: `${PREFIX} Ary Dogs`, stageId: stages[0].id },
      { name: `${PREFIX} Ary Dogs`, stageId: stages[0].id },
    ]);
    expect(res.body.rows).toEqual([
      { index: 0, status: 'created' },
      {
        index: 1,
        status: 'duplicate',
        reason: 'Repetido na planilha (igual à linha 1 do envio)',
      },
    ]);
  });

  it('linha com problema fica de fora com o motivo; as outras entram', async () => {
    const res = await importLeads([
      { name: '   ', stageId: stages[0].id },
      { name: `${PREFIX} A`, email: 'sem-arroba', stageId: stages[0].id },
      {
        name: `${PREFIX} B`,
        instagramUsername: 'nome com espaço',
        stageId: stages[0].id,
      },
      { name: `${PREFIX} C`, stageId: '7d2c5a3e-0000-4000-8000-000000000000' },
      { name: `${PREFIX} D`, stageId: stages[0].id },
    ]);
    expect(res.body.rows).toEqual([
      { index: 0, status: 'invalid', reason: 'Sem nome' },
      { index: 1, status: 'invalid', reason: 'E-mail inválido' },
      { index: 2, status: 'invalid', reason: '@ do Instagram inválido' },
      { index: 3, status: 'invalid', reason: 'Etapa não encontrada' },
      { index: 4, status: 'created' },
    ]);
  });

  it('pedido vazio, sem etapa ou sem login: recusado', async () => {
    await api().post('/leads/import').set(auth).send({ leads: [] }).expect(400);
    await api()
      .post('/leads/import')
      .set(auth)
      .send({ leads: [{ name: 'X' }] })
      .expect(400);
    await api().post('/leads/import').send({ leads: [] }).expect(401);
  });
});
