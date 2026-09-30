import {
  GRAPH_VERSION,
  InstagramApiClient,
  InstagramApiError,
  MAX_AVATAR_BYTES,
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
      reply(200, {
        name: 'Maria Souza',
        username: 'maria.s',
        profile_pic: 'https://cdn.exemplo.test/maria.jpg',
        id: '99',
      });
      expect(await client.getMessagingProfile('99', 'tok')).toEqual({
        name: 'Maria Souza',
        username: 'maria.s',
        profilePictureUrl: 'https://cdn.exemplo.test/maria.jpg',
      });
      expect(lastCall().url.pathname).toBe(`/${GRAPH_VERSION}/99`);
      expect(lastCall().url.searchParams.get('fields')).toBe(
        'name,username,profile_pic',
      );

      reply(200, { id: '99' });
      expect(await client.getMessagingProfile('99', 'tok')).toEqual({
        name: null,
        username: null,
        profilePictureUrl: null,
      });
    });

    it('manda texto no direct com JSON e o token no cabeçalho', async () => {
      reply(200, { recipient_id: 'igsid-1', message_id: 'mid-1' });
      expect(await client.sendTextMessage('tk', 'igsid-1', 'Oi!')).toBe(
        'mid-1',
      );
      const { url, init } = lastCall();
      expect(url.href).toBe(
        `https://graph.instagram.com/${GRAPH_VERSION}/me/messages`,
      );
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer tk' });
      expect(JSON.parse(init?.body as string)).toEqual({
        recipient: { id: 'igsid-1' },
        message: { text: 'Oi!' },
      });
    });

    it('baixa a foto de perfil, até 2 MB', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(Buffer.from('jpeg'), { status: 200 }),
      );
      expect(
        (
          await client.downloadImage('https://cdn.exemplo.test/a.jpg')
        ).toString(),
      ).toBe('jpeg');

      fetchMock.mockResolvedValueOnce(
        new Response(Buffer.alloc(MAX_AVATAR_BYTES + 1), { status: 200 }),
      );
      await expect(
        client.downloadImage('https://cdn.exemplo.test/grande.jpg'),
      ).rejects.toMatchObject({ status: 413 });

      fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
      await expect(
        client.downloadImage('https://cdn.exemplo.test/sumiu.jpg'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('posts no perfil', () => {
    const page = (items: [string, string][], next?: string) => ({
      data: items.map(([id, timestamp]) => ({ id, timestamp })),
      ...(next ? { paging: { next } } : {}),
    });

    it('segue as páginas até passar da data pedida', async () => {
      reply(
        200,
        page(
          [
            ['m3', '2026-09-30T12:00:00+0000'],
            ['m2', '2026-09-29T12:00:00+0000'],
          ],
          'https://graph.instagram.com/next-1',
        ),
      );
      reply(
        200,
        page(
          [['m1', '2026-09-20T12:00:00+0000']],
          'https://graph.instagram.com/next-2',
        ),
      );

      const media = await client.listProfileMedia(
        'tk',
        new Date('2026-09-25T00:00:00Z'),
      );
      expect([...media.ids]).toEqual(['m3', 'm2', 'm1']);
      expect(media.complete).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const first = new URL(fetchMock.mock.calls[0][0] as string);
      expect(first.pathname).toBe(`/${GRAPH_VERSION}/me/media`);
      expect(first.searchParams.get('fields')).toBe('id,timestamp');
      expect(lastCall().url.href).toBe('https://graph.instagram.com/next-1');
    });

    it('fim do perfil é lista completa; limite de páginas não', async () => {
      reply(200, page([['m1', '2026-09-30T12:00:00+0000']]));
      const all = await client.listProfileMedia('tk', new Date(0));
      expect(all.complete).toBe(true);

      reply(200, page([['m2', '2026-09-30T12:00:00+0000']], 'https://n/1'));
      const partial = await client.listProfileMedia('tk', new Date(0), 1);
      expect(partial.complete).toBe(false);
      expect(partial.oldest?.toISOString()).toBe('2026-09-30T12:00:00.000Z');
    });
  });

  it('sem resposta da Meta vira InstagramApiError com status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const error = await client.getProfile('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InstagramApiError);
    expect((error as InstagramApiError).status).toBe(0);
  });
});
