import { encryptSecret } from '../common/crypto/secret-box.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { type InstagramApiClient, InstagramApiError } from './instagram-api.client.js';
import { InstagramInsightsService } from './instagram-insights.service.js';
import type { InstagramSettingsService } from './instagram-settings.service.js';

// Monta a resposta da aba Desempenho com a Meta simulada.
describe('InstagramInsightsService', () => {
  const key = Buffer.alloc(32, 7);
  const account = { id: 'conta-1', accessToken: encryptSecret('token', key) };
  const prisma = {
    instagramAccount: { findFirst: vi.fn(), update: vi.fn() },
  };
  const settings = { requireKey: () => key };
  const api = {
    getAccountInsight: vi.fn(),
    getFollowsInPeriod: vi.fn(),
    getProfileOverview: vi.fn(),
    listMediaWithCounts: vi.fn(),
    getMediaInsights: vi.fn(),
  };
  const service = () =>
    new InstagramInsightsService(
      prisma as unknown as PrismaService,
      settings as unknown as InstagramSettingsService,
      api as unknown as InstagramApiClient,
    );

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.instagramAccount.findFirst.mockResolvedValue(account);
    api.getFollowsInPeriod.mockResolvedValue({ follows: 3, unfollows: 1 });
    api.getProfileOverview.mockResolvedValue({ followers: 950 });
    api.listMediaWithCounts.mockResolvedValue([]);
  });

  it('sem conta conectada não chama a Meta', async () => {
    prisma.instagramAccount.findFirst.mockResolvedValue(null);
    expect(await service().getInsights(7)).toEqual({ status: 'sem-conta' });
    expect(api.getAccountInsight).not.toHaveBeenCalled();
  });

  it('conta conectada antes da permissão de estatísticas pede para conectar de novo', async () => {
    api.getAccountInsight.mockRejectedValue(
      new InstagramApiError('(#10) Application does not have permission for this action', 403, 10),
    );
    expect(await service().getInsights(7)).toEqual({ status: 'sem-permissao' });
  });

  it('soma o período atual e o anterior; métrica recusada fica nula sem derrubar as outras', async () => {
    const now = new Date('2026-10-28T12:00:00Z');
    const inicio = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    api.getAccountInsight.mockImplementation(async (_t: string, metric: string, since: Date) => {
      if (metric === 'website_clicks') throw new InstagramApiError('metric inválida', 400, 100);
      const atual = since.getTime() > inicio - 60 * 60 * 1000;
      return { reach: atual ? 500 : 400, views: atual ? 900 : 1000 }[metric] ?? 7;
    });

    const resposta = await service().getInsights(7, now);
    expect(resposta.status).toBe('ok');
    if (resposta.status !== 'ok') return;
    expect(resposta.followers).toBe(950);
    expect(resposta.follows).toEqual({ follows: 3, unfollows: 1 });
    expect(resposta.account.reach).toEqual({ current: 500, previous: 400 });
    expect(resposta.account.views).toEqual({ current: 900, previous: 1000 });
    expect(resposta.account.website_clicks).toEqual({ current: null, previous: null });
    // Nenhum período passa de 30 dias (limite da Meta)
    for (const [, , since, until] of api.getAccountInsight.mock.calls as [string, string, Date, Date][]) {
      expect(until.getTime() - since.getTime()).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
    }
  });

  it('vídeo que recusa o tempo assistido é lido de novo sem ele', async () => {
    api.getAccountInsight.mockResolvedValue(10);
    api.listMediaWithCounts.mockResolvedValue([
      { id: 'v1', type: 'VIDEO', caption: null, imageUrl: null, permalink: null, timestamp: null, likes: 4, comments: 1 },
    ]);
    api.getMediaInsights
      .mockRejectedValueOnce(new InstagramApiError('métrica não suportada', 400, 100))
      .mockResolvedValueOnce({ views: 300, reach: 200, saved: 5, shares: 2, total_interactions: 12 });

    const resposta = await service().getInsights(30);
    if (resposta.status !== 'ok') throw new Error(resposta.status);
    expect(resposta.posts[0]).toMatchObject({ id: 'v1', views: 300, reach: 200, interactions: 12, likes: 4, avgWatchMs: null });
    expect(api.getMediaInsights.mock.calls[0][2]).toContain('ig_reels_avg_watch_time');
    expect(api.getMediaInsights.mock.calls[1][2]).not.toContain('ig_reels_avg_watch_time');
  });

  it('guarda a resposta por alguns minutos (trocar de aba não refaz as chamadas)', async () => {
    api.getAccountInsight.mockResolvedValue(10);
    const s = service();
    const now = new Date();
    await s.getInsights(7, now);
    const chamadas = api.getAccountInsight.mock.calls.length;
    await s.getInsights(7, new Date(now.getTime() + 60_000));
    expect(api.getAccountInsight.mock.calls.length).toBe(chamadas);
  });
});
