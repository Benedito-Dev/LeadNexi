import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import {
  decryptSecret,
  encryptSecret,
  resolveEncryptionKey,
} from './../src/common/crypto/secret-box.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './../src/instagram/instagram-api.client.js';
import { OAUTH_STATE_AUDIENCE } from './../src/instagram/instagram.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Conexão com o Instagram com a Meta simulada: link de login, volta do login (callback),
// token criptografado e renovação pelo cron.
describe('Instagram (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  const api = () => request(app.getHttpServer());
  const key = randomBytes(32);
  const cron = { Authorization: 'Bearer segredo-do-cron' };

  // Meta simulada: cada teste ajusta as respostas que precisa
  const meta = {
    exchangeCode: vi.fn(),
    exchangeForLongLived: vi.fn(),
    refreshLongLived: vi.fn(),
    getProfile: vi.fn(),
  };

  beforeAll(async () => {
    process.env.INSTAGRAM_APP_ID = 'app-de-teste';
    process.env.INSTAGRAM_APP_SECRET = 'segredo-do-app';
    process.env.INSTAGRAM_REDIRECT_URI =
      'https://exemplo.test/api/instagram/callback';
    process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64');
    process.env.CRON_SECRET = 'segredo-do-cron';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InstagramApiClient)
      .useValue(meta)
      .compile();
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
  });

  beforeEach(async () => {
    await prisma.instagramAccount.deleteMany();
    await prisma.instagramAppSettings.deleteMany();
    Object.values(meta).forEach((fn) => fn.mockReset());
    meta.exchangeCode.mockResolvedValue('token-curto');
    meta.exchangeForLongLived.mockResolvedValue({
      accessToken: 'token-longo',
      expiresIn: 5184000,
    });
    meta.getProfile.mockResolvedValue({
      userId: '17841400000000001',
      username: 'loja.teste',
      name: 'Loja Teste',
      profilePictureUrl: 'https://cdn.exemplo.test/foto.jpg',
      accountType: 'Business',
    });
  });

  afterAll(async () => {
    await prisma.instagramAccount.deleteMany();
    await prisma.instagramAppSettings.deleteMany();
    await app.close();
  });

  /** `state` de verdade, como o frontend recebe ao clicar em "Conectar" */
  async function validState() {
    const res = await api().post('/instagram/connect').set(auth).expect(200);
    return new URL(res.body.url as string).searchParams.get('state')!;
  }

  /** Simula a Meta devolvendo o navegador para o callback; responde com o destino do redirect */
  async function callback(query: Record<string, string>) {
    const res = await api().get('/instagram/callback').query(query).expect(302);
    return res.headers.location;
  }

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

  it('sem app da Meta (nem na tela, nem no servidor), "conectar" responde 503', async () => {
    delete process.env.INSTAGRAM_APP_SECRET;
    try {
      const res = await api().post('/instagram/connect').set(auth).expect(503);
      expect(res.body.message).toBe(
        'Configure o app da Meta na tela do Instagram.',
      );
    } finally {
      process.env.INSTAGRAM_APP_SECRET = 'segredo-do-app';
    }
  });

  it('conecta a conta e guarda o token criptografado', async () => {
    const location = await callback({
      code: 'codigo-da-meta',
      state: await validState(),
    });
    expect(location).toBe('/instagram?conectado=1');
    expect(meta.exchangeCode).toHaveBeenCalledWith('codigo-da-meta', {
      appId: 'app-de-teste',
      appSecret: 'segredo-do-app',
      redirectUri: 'https://exemplo.test/api/instagram/callback',
    });
    expect(meta.exchangeForLongLived).toHaveBeenCalledWith(
      'token-curto',
      'segredo-do-app',
    );
    expect(meta.getProfile).toHaveBeenCalledWith('token-longo');

    const res = await api().get('/instagram/account').set(auth).expect(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.account).toMatchObject({
      username: 'loja.teste',
      name: 'Loja Teste',
      needsReconnect: false,
    });
    expect(res.body.account.accessToken).toBeUndefined();

    const saved = await prisma.instagramAccount.findFirstOrThrow();
    expect(saved.igUserId).toBe('17841400000000001');
    expect(saved.accessToken).not.toContain('token-longo');
    expect(decryptSecret(saved.accessToken, key)).toBe('token-longo');
    const days = (saved.tokenExpiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(59);
    expect(days).toBeLessThan(61);
  });

  it('conectar outra conta substitui a anterior', async () => {
    await callback({ code: 'a', state: await validState() });
    meta.getProfile.mockResolvedValue({
      userId: '17841400000000002',
      username: 'outra.loja',
      name: null,
      profilePictureUrl: null,
      accountType: 'Media_Creator',
    });
    expect(await callback({ code: 'b', state: await validState() })).toBe(
      '/instagram?conectado=1',
    );
    const accounts = await prisma.instagramAccount.findMany();
    expect(accounts.map((account) => account.username)).toEqual(['outra.loja']);
  });

  it('cancelar no Instagram volta com erro=negado', async () => {
    const location = await callback({
      error: 'access_denied',
      error_reason: 'user_denied',
      state: await validState(),
    });
    expect(location).toBe('/instagram?erro=negado');
    expect(meta.exchangeCode).not.toHaveBeenCalled();
  });

  it('recusa state ausente, falso, vencido ou que seja um token de acesso', async () => {
    const jwt = app.get(JwtService);
    const expired = await jwt.signAsync(
      { sub: 'x' },
      { audience: OAUTH_STATE_AUDIENCE, expiresIn: -60 },
    );
    const accessToken = auth.Authorization.replace('Bearer ', '');

    expect(await callback({ code: 'c' })).toBe('/instagram?erro=falha');
    expect(await callback({ code: 'c', state: 'nao-e-um-jwt' })).toBe(
      '/instagram?erro=falha',
    );
    expect(await callback({ code: 'c', state: expired })).toBe(
      '/instagram?erro=expirado',
    );
    expect(await callback({ code: 'c', state: accessToken })).toBe(
      '/instagram?erro=falha',
    );
    expect(meta.exchangeCode).not.toHaveBeenCalled();
    expect(await prisma.instagramAccount.count()).toBe(0);
  });

  it('conta pessoal volta com erro=conta e não é salva', async () => {
    meta.getProfile.mockResolvedValue({
      userId: '1',
      username: 'pessoal',
      name: null,
      profilePictureUrl: null,
      accountType: 'Personal',
    });
    expect(await callback({ code: 'c', state: await validState() })).toBe(
      '/instagram?erro=conta',
    );
    expect(await prisma.instagramAccount.count()).toBe(0);
  });

  it('falha na Meta volta com erro=falha e não salva nada', async () => {
    meta.exchangeCode.mockRejectedValue(
      new InstagramApiError('Invalid code', 400, 400),
    );
    expect(await callback({ code: 'c', state: await validState() })).toBe(
      '/instagram?erro=falha',
    );
    expect(await prisma.instagramAccount.count()).toBe(0);
  });

  describe('renovação do token (cron)', () => {
    const DAY = 86_400_000;

    /** Conta gravada direto no banco, com token de validade e idade controladas */
    function createAccount(
      username: string,
      expiresInDays: number,
      ageDays: number,
    ) {
      return prisma.instagramAccount.create({
        data: {
          igUserId: `id-${username}`,
          username,
          accessToken: encryptSecret(`token-${username}`, key),
          tokenExpiresAt: new Date(Date.now() + expiresInDays * DAY),
          updatedAt: new Date(Date.now() - ageDays * DAY),
        },
      });
    }

    it('só o cron autorizado chama', async () => {
      await api().get('/cron/instagram-daily').expect(401);
      await api()
        .get('/cron/instagram-daily')
        .set('Authorization', 'Bearer errado')
        .expect(401);
      // O token de login do usuário também não serve
      await api().get('/cron/instagram-daily').set(auth).expect(401);
    });

    it('renova só o que vence em até 10 dias e tem mais de 24 h', async () => {
      await createAccount('vence-logo', 5, 50);
      await createAccount('recente', 5, 0.5);
      await createAccount('longe', 40, 20);
      meta.refreshLongLived.mockResolvedValue({
        accessToken: 'token-renovado',
        expiresIn: 5184000,
      });

      const res = await api()
        .get('/cron/instagram-daily')
        .set(cron)
        .expect(200);
      expect(res.body.tokens).toEqual({ refreshed: 1, invalid: 0, failed: 0 });
      expect(meta.refreshLongLived).toHaveBeenCalledTimes(1);
      expect(meta.refreshLongLived).toHaveBeenCalledWith('token-vence-logo');

      const renewed = await prisma.instagramAccount.findUniqueOrThrow({
        where: { igUserId: 'id-vence-logo' },
      });
      expect(decryptSecret(renewed.accessToken, key)).toBe('token-renovado');
      expect(renewed.tokenExpiresAt.getTime()).toBeGreaterThan(
        Date.now() + 59 * DAY,
      );
    });

    it('token recusado pela Meta pede reconexão na tela', async () => {
      await createAccount('revogada', 5, 50);
      meta.refreshLongLived.mockRejectedValue(
        new InstagramApiError('Error validating access token', 400, 190),
      );

      const res = await api()
        .get('/cron/instagram-daily')
        .set(cron)
        .expect(200);
      expect(res.body.tokens).toEqual({ refreshed: 0, invalid: 1, failed: 0 });
      const account = await api()
        .get('/instagram/account')
        .set(auth)
        .expect(200);
      expect(account.body.account.needsReconnect).toBe(true);
    });

    it('falha passageira não marca a conta (tenta de novo amanhã)', async () => {
      await createAccount('instavel', 5, 50);
      meta.refreshLongLived.mockRejectedValue(
        new InstagramApiError('Sem resposta da Meta', 0),
      );

      const res = await api()
        .get('/cron/instagram-daily')
        .set(cron)
        .expect(200);
      expect(res.body.tokens).toEqual({ refreshed: 0, invalid: 0, failed: 1 });
      const account = await api()
        .get('/instagram/account')
        .set(auth)
        .expect(200);
      expect(account.body.account.needsReconnect).toBe(false);
    });

    it('token que não abre com a chave atual (chave trocada) pede reconexão', async () => {
      await prisma.instagramAccount.create({
        data: {
          igUserId: 'id-outra-chave',
          username: 'outra-chave',
          accessToken: encryptSecret('token', randomBytes(32)),
          tokenExpiresAt: new Date(Date.now() + 5 * DAY),
          updatedAt: new Date(Date.now() - 50 * DAY),
        },
      });

      const res = await api()
        .get('/cron/instagram-daily')
        .set(cron)
        .expect(200);
      expect(res.body.tokens).toEqual({ refreshed: 0, invalid: 1, failed: 0 });
      expect(meta.refreshLongLived).not.toHaveBeenCalled();
      const account = await api()
        .get('/instagram/account')
        .set(auth)
        .expect(200);
      expect(account.body.account.needsReconnect).toBe(true);
    });

    it('token vencido também pede reconexão', async () => {
      await createAccount('vencida', -1, 70);
      const account = await api()
        .get('/instagram/account')
        .set(auth)
        .expect(200);
      expect(account.body.account.needsReconnect).toBe(true);
    });
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

  describe('app da Meta configurado pela tela', () => {
    const SECRET = 'segredo-da-tela-0123456789';
    const ENV_NAMES = [
      'INSTAGRAM_APP_ID',
      'INSTAGRAM_APP_SECRET',
      'INSTAGRAM_REDIRECT_URI',
    ];
    /** Servidor como na produção: atrás do proxy, em https://leadnexi.test */
    const behindProxy = <T extends { set: (k: string, v: string) => T }>(
      req: T,
    ) => req.set('Host', 'leadnexi.test').set('X-Forwarded-Proto', 'https');

    /** Tira as variáveis INSTAGRAM_* durante o teste: só vale o que a tela salvar */
    async function withoutEnv(run: () => Promise<void>) {
      const saved = ENV_NAMES.map((name) => [name, process.env[name]]);
      ENV_NAMES.forEach((name) => delete process.env[name]);
      try {
        await run();
      } finally {
        saved.forEach(([name, value]) => (process.env[name!] = value));
      }
    }

    it('sem nada configurado, mostra o endereço de retorno deste servidor', async () => {
      await withoutEnv(async () => {
        const res = await behindProxy(
          api().get('/instagram/settings').set(auth),
        ).expect(200);
        expect(res.body).toEqual({
          appId: null,
          secretSaved: false,
          source: null,
          configured: false,
          redirectUri: 'https://leadnexi.test/api/instagram/callback',
        });
      });
    });

    it('com as variáveis do servidor, mostra de onde vem, sem a chave', async () => {
      const res = await api().get('/instagram/settings').set(auth).expect(200);
      expect(res.body).toEqual({
        appId: 'app-de-teste',
        secretSaved: true,
        source: 'servidor',
        configured: true,
        redirectUri: 'https://exemplo.test/api/instagram/callback',
      });
      expect(JSON.stringify(res.body)).not.toContain('segredo-do-app');
    });

    it('salva pela tela (chave criptografada) e usa no login de ponta a ponta', async () => {
      await withoutEnv(async () => {
        const res = await behindProxy(
          api().put('/instagram/settings').set(auth),
        )
          .send({ appId: '2031084050892157', appSecret: SECRET })
          .expect(200);
        expect(res.body).toMatchObject({
          appId: '2031084050892157',
          secretSaved: true,
          source: 'tela',
          configured: true,
        });
        expect(JSON.stringify(res.body)).not.toContain(SECRET);

        const saved = await prisma.instagramAppSettings.findFirstOrThrow();
        expect(saved.appSecret).not.toContain(SECRET);
        expect(decryptSecret(saved.appSecret, key)).toBe(SECRET);

        const connect = await behindProxy(
          api().post('/instagram/connect').set(auth),
        ).expect(200);
        const url = new URL(connect.body.url as string);
        expect(url.searchParams.get('client_id')).toBe('2031084050892157');
        expect(url.searchParams.get('redirect_uri')).toBe(
          'https://leadnexi.test/api/instagram/callback',
        );

        const back = await behindProxy(api().get('/instagram/callback'))
          .query({ code: 'c', state: url.searchParams.get('state')! })
          .expect(302);
        expect(back.headers.location).toBe('/instagram?conectado=1');
        expect(meta.exchangeCode).toHaveBeenCalledWith('c', {
          appId: '2031084050892157',
          appSecret: SECRET,
          redirectUri: 'https://leadnexi.test/api/instagram/callback',
        });
      });
    });

    it('o que foi salvo na tela vale mais que as variáveis do servidor', async () => {
      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: '999999999', appSecret: SECRET })
        .expect(200);
      const connect = await api()
        .post('/instagram/connect')
        .set(auth)
        .expect(200);
      expect(
        new URL(connect.body.url as string).searchParams.get('client_id'),
      ).toBe('999999999');
    });

    it('na primeira vez exige a chave; depois, trocar só o ID mantém a chave salva', async () => {
      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: '111111' })
        .expect(400);
      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: '111111', appSecret: SECRET })
        .expect(200);
      const before = await prisma.instagramAppSettings.findFirstOrThrow();

      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: '222222' })
        .expect(200);
      const after = await prisma.instagramAppSettings.findFirstOrThrow();
      expect(after.appId).toBe('222222');
      expect(after.appSecret).toBe(before.appSecret);
    });

    it('recusa ID com letras e chave curta demais', async () => {
      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: 'abc123', appSecret: SECRET })
        .expect(400);
      await api()
        .put('/instagram/settings')
        .set(auth)
        .send({ appId: '123456', appSecret: 'curta' })
        .expect(400);
      expect(await prisma.instagramAppSettings.count()).toBe(0);
    });

    it('sem TOKEN_ENCRYPTION_KEY, usa a chave derivada do JWT_SECRET', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      try {
        await api()
          .put('/instagram/settings')
          .set(auth)
          .send({ appId: '123456', appSecret: SECRET })
          .expect(200);
        const saved = await prisma.instagramAppSettings.findFirstOrThrow();
        const derived = resolveEncryptionKey(
          undefined,
          process.env.JWT_SECRET,
        )!;
        expect(decryptSecret(saved.appSecret, derived)).toBe(SECRET);
        await api().post('/instagram/connect').set(auth).expect(200);
      } finally {
        process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64');
      }
    });

    it('exige login', async () => {
      await api().get('/instagram/settings').expect(401);
      await api()
        .put('/instagram/settings')
        .send({ appId: '123456' })
        .expect(401);
    });
  });

  it('exige login, menos na volta do Instagram', async () => {
    await api().get('/instagram/account').expect(401);
    await api().post('/instagram/connect').expect(401);
    await api().get('/instagram/callback').expect(302);
  });
});
