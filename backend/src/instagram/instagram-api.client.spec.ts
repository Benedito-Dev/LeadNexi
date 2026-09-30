import {
  GRAPH_VERSION,
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';

// Formato das chamadas à Meta e leitura das respostas, com o fetch simulado.
describe('InstagramApiClient', () => {
  const app = {
    appId: 'app-id',
    appSecret: 'app-secret',
    redirectUri: 'https://exemplo.test/api/instagram/callback',
  };
  const client = new InstagramApiClient();
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
    expect(await client.exchangeCode('abc', app)).toBe('curto');

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
    expect(await client.exchangeCode('abc', app)).toBe('curto');
  });

  it('troca o token curto pelo de 60 dias', async () => {
    reply(200, {
      access_token: 'longo',
      token_type: 'bearer',
      expires_in: 5183944,
    });
    expect(await client.exchangeForLongLived('curto', 'app-secret')).toEqual({
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
    const oauth = await client.exchangeCode('x', app).catch((e: unknown) => e);
    expect((oauth as InstagramApiError).message).toBe('Invalid code');
    expect((oauth as InstagramApiError).invalidToken).toBe(false);
  });

  describe('publicação', () => {
    const graph = `https://graph.instagram.com/${GRAPH_VERSION}`;
    const form = () => lastCall().init?.body as URLSearchParams;

    it('foto única: contêiner com imagem e legenda', async () => {
      reply(200, { id: 'c1' });
      const id = await client.createImageContainer('17841', 'tok', {
        imageUrl: 'https://leadnexi.test/api/instagram/media/m1?token=t',
        caption: 'Oi #moda',
      });
      expect(id).toBe('c1');
      expect(lastCall().url.href).toBe(`${graph}/17841/media`);
      expect(lastCall().init?.method).toBe('POST');
      expect(Object.fromEntries(form())).toEqual({
        image_url: 'https://leadnexi.test/api/instagram/media/m1?token=t',
        caption: 'Oi #moda',
        access_token: 'tok',
      });
    });

    it('carrossel: itens sem legenda, depois o carrossel com os filhos em ordem', async () => {
      reply(200, { id: 'i1' });
      await client.createImageContainer('17841', 'tok', {
        imageUrl: 'https://x/1',
        caption: 'ignorada',
        carouselItem: true,
      });
      expect(Object.fromEntries(form())).toEqual({
        image_url: 'https://x/1',
        is_carousel_item: 'true',
        access_token: 'tok',
      });

      reply(200, { id: 'car' });
      expect(
        await client.createCarouselContainer('17841', 'tok', {
          children: ['i1', 'i2'],
          caption: 'Legenda',
        }),
      ).toBe('car');
      expect(Object.fromEntries(form())).toEqual({
        media_type: 'CAROUSEL',
        children: 'i1,i2',
        caption: 'Legenda',
        access_token: 'tok',
      });
    });

    it('status do contêiner, publicação e link do post', async () => {
      reply(200, { status_code: 'FINISHED', id: 'c1' });
      expect(await client.getContainerStatus('c1', 'tok')).toBe('FINISHED');
      expect(lastCall().url.pathname).toBe(`/${GRAPH_VERSION}/c1`);
      expect(lastCall().url.searchParams.get('fields')).toBe('status_code');

      reply(200, { id: 'media-1' });
      expect(await client.publishContainer('17841', 'tok', 'c1')).toBe(
        'media-1',
      );
      expect(lastCall().url.href).toBe(`${graph}/17841/media_publish`);
      expect(form().get('creation_id')).toBe('c1');

      reply(200, { permalink: 'https://www.instagram.com/p/abc/' });
      expect(await client.getPermalink('media-1', 'tok')).toBe(
        'https://www.instagram.com/p/abc/',
      );
    });

    it('lê o subcódigo do erro (ex.: limite diário de posts)', async () => {
      reply(400, {
        error: {
          message: 'Application request limit reached',
          code: 9,
          error_subcode: 2207042,
        },
      });
      const error = await client
        .publishContainer('17841', 'tok', 'c1')
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ code: 9, subcode: 2207042 });
    });
  });

  describe('direct', () => {
    it('liga os avisos de mensagens da conta', async () => {
      reply(200, { success: true });
      await client.subscribeToMessages('tok');
      const { url, init } = lastCall();
      expect(url.href).toBe(
        `https://graph.instagram.com/${GRAPH_VERSION}/me/subscribed_apps`,
      );
      expect(init?.method).toBe('POST');
      expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
        subscribed_fields: 'messages',
        access_token: 'tok',
      });
    });

    it('lê nome e @ de quem mandou mensagem (campos podem faltar)', async () => {
      reply(200, { name: 'Maria Souza', username: 'maria.s', id: '99' });
      expect(await client.getMessagingProfile('99', 'tok')).toEqual({
        name: 'Maria Souza',
        username: 'maria.s',
      });
      expect(lastCall().url.pathname).toBe(`/${GRAPH_VERSION}/99`);
      expect(lastCall().url.searchParams.get('fields')).toBe('name,username');

      reply(200, { id: '99' });
      expect(await client.getMessagingProfile('99', 'tok')).toEqual({
        name: null,
        username: null,
      });
    });
  });

  it('sem resposta da Meta vira InstagramApiError com status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const error = await client.getProfile('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InstagramApiError);
    expect((error as InstagramApiError).status).toBe(0);
  });
});
