import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Fluxo completo do histórico num lead de teste, apagado no final (cascade leva o histórico junto).
// Usa o usuário do seed (SEED_USER_EMAIL / SEED_USER_PASSWORD) e o primeiro pipeline com 2+ etapas.
describe('Histórico do lead (e2e)', () => {
  let app: INestApplication<App>;
  let auth: { Authorization: string };
  let stages: { id: string; name: string }[];
  let leadId: string | undefined;

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

  afterAll(async () => {
    if (leadId) await api().delete(`/leads/${leadId}`).set(auth);
    await app.close();
  });

  it('registra criação, mudança de etapa, nota e follow-up', async () => {
    const created = await api()
      .post('/leads')
      .set(auth)
      .send({
        name: 'Lead de teste (e2e)',
        source: 'Site',
        stageId: stages[0].id,
      })
      .expect(201);
    leadId = created.body.id as string;
    expect(created.body.followUpAt).toBeNull();

    await api()
      .patch(`/leads/${leadId}/move`)
      .set(auth)
      .send({ stageId: stages[1].id, position: 0 })
      .expect(200);

    // Reordenar na mesma coluna não é mudança de etapa
    await api()
      .patch(`/leads/${leadId}/move`)
      .set(auth)
      .send({ stageId: stages[1].id, position: 0 })
      .expect(200);

    const note = await api()
      .post(`/leads/${leadId}/notes`)
      .set(auth)
      .send({ text: '  Pediu orçamento  ' })
      .expect(201);
    expect(note.body.text).toBe('Pediu orçamento');

    const dueAt = '2030-01-15T13:00:00.000Z';
    const scheduled = await api()
      .put(`/leads/${leadId}/follow-up`)
      .set(auth)
      .send({ dueAt, note: 'Ligar' })
      .expect(200);
    expect(scheduled.body.followUpAt).toBe(dueAt);
    expect(scheduled.body.followUpNote).toBe('Ligar');

    const done = await api()
      .post(`/leads/${leadId}/follow-up/complete`)
      .set(auth)
      .expect(200);
    expect(done.body.followUpAt).toBeNull();

    const history = await api()
      .get(`/leads/${leadId}/activities`)
      .set(auth)
      .expect(200);
    const events = history.body as {
      type: string;
      fromStage: string | null;
      toStage: string | null;
      text: string | null;
      dueAt: string | null;
    }[];
    expect(events.map((e) => e.type)).toEqual([
      'FOLLOW_UP_DONE',
      'FOLLOW_UP_SCHEDULED',
      'NOTE',
      'STAGE_CHANGED',
      'CREATED',
    ]);
    expect(events[0]).toMatchObject({ text: 'Ligar', dueAt });
    expect(events[3]).toMatchObject({
      fromStage: stages[0].name,
      toStage: stages[1].name,
    });
    expect(events[4]).toMatchObject({ text: 'Site', toStage: stages[0].name });
  });

  it('só apaga anotações', async () => {
    const history = await api()
      .get(`/leads/${leadId}/activities`)
      .set(auth)
      .expect(200);
    const events = history.body as { id: string; type: string }[];
    const note = events.find((e) => e.type === 'NOTE');
    const created = events.find((e) => e.type === 'CREATED');

    await api()
      .delete(`/leads/${leadId}/notes/${created?.id}`)
      .set(auth)
      .expect(400);
    await api()
      .delete(`/leads/${leadId}/notes/${note?.id}`)
      .set(auth)
      .expect(204);
    await api()
      .delete(`/leads/${leadId}/notes/${note?.id}`)
      .set(auth)
      .expect(404);
  });

  it('valida entrada e estado do follow-up', async () => {
    await api()
      .post(`/leads/${leadId}/notes`)
      .set(auth)
      .send({ text: '' })
      .expect(400);
    await api()
      .put(`/leads/${leadId}/follow-up`)
      .set(auth)
      .send({ dueAt: 'amanhã' })
      .expect(400);
    // Nada agendado: concluir é erro, cancelar é idempotente
    await api()
      .post(`/leads/${leadId}/follow-up/complete`)
      .set(auth)
      .expect(400);
    await api().delete(`/leads/${leadId}/follow-up`).set(auth).expect(200);
  });
});
