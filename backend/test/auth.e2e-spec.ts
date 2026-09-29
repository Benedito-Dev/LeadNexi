import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Sessão com refresh token: login, renovação com rotação, reúso (roubo), logout e limite de tentativas.
// Usa o usuário do seed; as sessões criadas aqui são apagadas no final.
describe('Auth com refresh token (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const startedAt = new Date();
  const credentials = {
    email: process.env.SEED_USER_EMAIL,
    password: process.env.SEED_USER_PASSWORD,
  };

  const api = () => request(app.getHttpServer());

  /** "lnx_refresh=<valor>" do Set-Cookie da resposta */
  function refreshCookie(res: request.Response): string {
    const header = res.headers['set-cookie'] as unknown as string[] | undefined;
    const cookie = header?.find((value) => value.startsWith('lnx_refresh='));
    if (!cookie) throw new Error('Resposta sem cookie lnx_refresh');
    return cookie.split(';')[0];
  }

  async function login() {
    const res = await api().post('/auth/login').send(credentials).expect(200);
    return { res, cookie: refreshCookie(res) };
  }

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
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { createdAt: { gte: startedAt } },
    });
    await app.close();
  });

  it('login devolve access token e grava o refresh em cookie httpOnly', async () => {
    const { res } = await login();
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\/api\/auth/);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('refresh');

    await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
  });

  it('refresh troca o token (rotação) e devolve um access token novo', async () => {
    const { cookie } = await login();
    const renewed = await api()
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    expect(renewed.body).toHaveProperty('accessToken');
    expect(renewed.body.user).toHaveProperty('email');
    expect(refreshCookie(renewed)).not.toBe(cookie);
  });

  it('refresh sem cookie ou com cookie inválido é 401', async () => {
    await api().post('/auth/refresh').expect(401);
    await api()
      .post('/auth/refresh')
      .set('Cookie', 'lnx_refresh=nao-e-um-token')
      .expect(401);
  });

  it('reúso de token antigo (fora da tolerância) derruba a sessão inteira', async () => {
    const { cookie: first } = await login();
    const renewed = await api().post('/auth/refresh').set('Cookie', first);
    const second = refreshCookie(renewed);

    // Simula o reúso depois da janela de 30 s: o primeiro token foi revogado há 1 min
    const firstId = first.split('=')[1].split('.')[0];
    await prisma.refreshToken.update({
      where: { id: firstId },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    await api().post('/auth/refresh').set('Cookie', first).expect(401);
    // O token legítimo mais novo também morreu (família revogada)
    await api().post('/auth/refresh').set('Cookie', second).expect(401);
  });

  it('logout encerra a sessão no servidor', async () => {
    const { cookie } = await login();
    await api().post('/auth/logout').set('Cookie', cookie).expect(204);
    await api().post('/auth/refresh').set('Cookie', cookie).expect(401);
  });

  // Por último: bloqueia novos logins neste app por 1 minuto
  it('limita tentativas de login (força bruta)', async () => {
    const wrong = { email: credentials.email, password: 'senha-errada' };
    let status = 0;
    for (let attempt = 0; attempt < 6 && status !== 429; attempt++) {
      status = (await api().post('/auth/login').send(wrong)).status;
    }
    expect(status).toBe(429);
  });
});
