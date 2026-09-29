import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { OAUTH_STATE_AUDIENCE } from './../src/instagram/instagram.service.js';

// Conexão com o Instagram, sem falar com a Meta: status, link de login e o `state` do OAuth.
describe('Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.INSTAGRAM_APP_ID = 'app-de-teste';
    process.env.INSTAGRAM_REDIRECT_URI =
      'https://exemplo.test/api/instagram/callback';
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem conta conectada, responde connected: false', async () => {
    const res = await api().get('/instagram/account').set(auth).expect(200);
    expect(res.body).toEqual({ connected: false });
  });

  it('gera o link oficial de login com as permissões de publicação', async () => {
    const res = await api().post('/instagram/connect').set(auth).expect(200);
    const url = new URL(res.body.url as string);
    expect(url.origin + url.pathname).toBe(
      'https://www.instagram.com/oauth/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('app-de-teste');
    expect(url.searchParams.get('scope')).toContain(
      'instagram_business_content_publish',
    );
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('o state do OAuth não serve como token de acesso', async () => {
    const state = await app
      .get(JwtService)
      .signAsync({ sub: 'x' }, { audience: OAUTH_STATE_AUDIENCE });
    await api()
      .get('/instagram/account')
      .set('Authorization', `Bearer ${state}`)
      .expect(401);
  });

  it('exige login', async () => {
    await api().get('/instagram/account').expect(401);
    await api().post('/instagram/connect').expect(401);
  });
});
