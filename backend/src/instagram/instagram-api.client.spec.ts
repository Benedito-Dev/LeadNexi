import { ConfigService } from '@nestjs/config';
import {
  GRAPH_VERSION,
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';

// Formato das chamadas à Meta e leitura das respostas, com o fetch simulado.
describe('InstagramApiClient', () => {
  const config = new ConfigService({
    INSTAGRAM_APP_ID: 'app-id',
    INSTAGRAM_APP_SECRET: 'app-secret',
    INSTAGRAM_REDIRECT_URI: 'https://exemplo.test/api/instagram/callback',
  });
  const client = new InstagramApiClient(config);
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterAll(() => vi.unstubAllGlobals());

  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status }),
    );
  const lastCall = () => {
    const [input, init] = fetchMock.mock.calls.at(-1)!;
    const url = input instanceof Request ? input.url : input.toString();
    return { url: new URL(url), init };
  };

  it('troca o código por token com POST no formato de formulário', async () => {
    reply(200, { data: [{ access_token: 'curto', user_id: '17841' }] });
    expect(await client.exchangeCode('abc')).toBe('curto');

    const { url, init } = lastCall();
    expect(url.href).toBe('https://api.instagram.com/oauth/access_token');
    expect(init?.method).toBe('POST');
    const body = init?.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({
      client_id: 'app-id',
      client_secret: 'app-secret',
      grant_type: 'authorization_code',
      redirect_uri: 'https://exemplo.test/api/instagram/callback',
      code: 'abc',
    });
  });

  it('aceita a resposta da troca também sem o envelope data', async () => {
    reply(200, { access_token: 'curto', user_id: 17841 });
    expect(await client.exchangeCode('abc')).toBe('curto');
  });

  it('troca o token curto pelo de 60 dias', async () => {
    reply(200, {
      access_token: 'longo',
      token_type: 'bearer',
      expires_in: 5183944,
    });
    expect(await client.exchangeForLongLived('curto')).toEqual({
      accessToken: 'longo',
      expiresIn: 5183944,
    });
    const { url } = lastCall();
    expect(url.origin + url.pathname).toBe(
      'https://graph.instagram.com/access_token',
    );
    expect(url.searchParams.get('grant_type')).toBe('ig_exchange_token');
    expect(url.searchParams.get('client_secret')).toBe('app-secret');
    expect(url.searchParams.get('access_token')).toBe('curto');
  });

  it('renova o token de 60 dias', async () => {
    reply(200, {
      access_token: 'novo',
      token_type: 'bearer',
      expires_in: 5183944,
    });
    expect((await client.refreshLongLived('longo')).accessToken).toBe('novo');
    const { url } = lastCall();
    expect(url.origin + url.pathname).toBe(
      'https://graph.instagram.com/refresh_access_token',
    );
    expect(url.searchParams.get('grant_type')).toBe('ig_refresh_token');
    expect(url.searchParams.get('access_token')).toBe('longo');
  });

  it('lê o perfil (com ou sem o envelope data)', async () => {
    reply(200, {
      data: [
        {
          user_id: '17841',
          username: 'loja',
          name: 'Loja',
          account_type: 'Business',
          profile_picture_url: 'https://cdn.test/p.jpg',
        },
      ],
    });
    expect(await client.getProfile('longo')).toEqual({
      userId: '17841',
      username: 'loja',
      name: 'Loja',
      accountType: 'Business',
      profilePictureUrl: 'https://cdn.test/p.jpg',
    });
    const { url } = lastCall();
    expect(url.pathname).toBe(`/${GRAPH_VERSION}/me`);
    expect(url.searchParams.get('fields')).toContain('user_id');

    reply(200, { user_id: '17841', username: 'loja' });
    expect(await client.getProfile('longo')).toMatchObject({
      userId: '17841',
      name: null,
      profilePictureUrl: null,
    });
  });

  it('reconhece token recusado (código 190) e os dois formatos de erro', async () => {
    reply(400, {
      error: {
        message: 'Error validating access token',
        type: 'OAuthException',
        code: 190,
      },
    });
    const invalid = await client.refreshLongLived('x').catch((e: unknown) => e);
    expect(invalid).toBeInstanceOf(InstagramApiError);
    expect((invalid as InstagramApiError).invalidToken).toBe(true);

    reply(400, {
      error_type: 'OAuthException',
      code: 400,
      error_message: 'Invalid code',
    });
    const oauth = await client.exchangeCode('x').catch((e: unknown) => e);
    expect((oauth as InstagramApiError).message).toBe('Invalid code');
    expect((oauth as InstagramApiError).invalidToken).toBe(false);
  });

  it('sem resposta da Meta vira InstagramApiError com status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const error = await client.getProfile('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InstagramApiError);
    expect((error as InstagramApiError).status).toBe(0);
  });
});
