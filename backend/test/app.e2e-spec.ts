import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('LeadNexi API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health é público e confirma o banco', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('rotas protegidas exigem token', () => {
    return request(app.getHttpServer()).get('/pipelines').expect(401);
  });

  it('login com senha errada retorna 401', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ninguem@email.com', password: 'errada' })
      .expect(401);
  });
});
