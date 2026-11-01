import { encryptSecret } from '../common/crypto/secret-box.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { type InstagramApiClient, InstagramApiError, usagePercent } from './instagram-api.client.js';
import { FEED_METRICS, InstagramPostPerformanceService, REELS_METRICS } from './instagram-post-performance.service.js';
import type { InstagramSettingsService } from './instagram-settings.service.js';

const NOW = new Date('2026-10-31T12:00:00Z');
const HOUR = 60 * 60 * 1000;

const reel = { id: 'r1', mediaType: 'VIDEO', productType: 'REELS', caption: 'Reel', permalink: 'p1', timestamp: new Date('2026-10-20T12:00:00Z'), likes: 9, comments: 2 };
const foto = { id: 'f1', mediaType: 'IMAGE', productType: 'FEED', caption: 'Foto', permalink: 'p2', timestamp: new Date('2026-10-21T12:00:00Z'), likes: 3, comments: null };

// Coleta, cache e erros do ranking de desempenho com a Meta e o banco simulados.
describe('InstagramPostPerformanceService', () => {
  const key = Buffer.alloc(32, 7);
  const account = { id: 'conta-1', igUserId: 'ig-1', accessToken: encryptSecret('token', key) };
  const prisma = {
    instagramAccount: { findFirst: vi.fn(), update: vi.fn() },
    postMetric: { findFirst: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  };
  const api = { listMediaSince: vi.fn(), readMediaInsights: vi.fn() };
  const wait = vi.fn().mockResolvedValue(undefined);
  const service = () =>
    new InstagramPostPerformanceService(
      prisma as unknown as PrismaService,
      { requireKey: () => key } as unknown as InstagramSettingsService,
      api as unknown as InstagramApiClient,
    );
  const saved = () => prisma.postMetric.createMany.mock.calls[0]?.[0].data as Record<string, unknown>[];

  beforeEach(() => {
    vi.resetAllMocks();
    wait.mockResolvedValue(undefined);
    prisma.instagramAccount.findFirst.mockResolvedValue(account);
    prisma.postMetric.findFirst.mockResolvedValue(null);
    prisma.postMetric.findMany.mockResolvedValue([]);
    api.listMediaSince.mockResolvedValue({ media: [reel, foto], complete: true });
    api.readMediaInsights.mockResolvedValue({ values: { views: 100, reach: 80 }, usagePercent: 10 });
  });

  it('sem conta conectada pede para reconectar, sem chamar a Meta', async () => {
    prisma.instagramAccount.findFirst.mockResolvedValue(null);
    const r = await service().getReport({}, NOW, wait);
    expect(r.status).toBe('sem-conta');
    expect(r.avisos[0]).toMatch(/reconecte o Instagram no LeadNexi/);
    expect(api.listMediaSince).not.toHaveBeenCalled();
  });

  it('coleta há menos de 6 h: devolve do banco e avisa o horário', async () => {
    prisma.postMetric.findFirst.mockResolvedValue({ collectedAt: new Date(NOW.getTime() - 2 * HOUR) });
    const r = await service().getReport({}, NOW, wait);
    expect(api.listMediaSince).not.toHaveBeenCalled();
    expect(r.avisos[0]).toMatch(/^Dados do banco, coletados em 31\/10\/2026/);
  });

  it('forcar_atualizacao ignora o cache', async () => {
    prisma.postMetric.findFirst.mockResolvedValue({ collectedAt: new Date(NOW.getTime() - 2 * HOUR) });
    await service().getReport({ refresh: true }, NOW, wait);
    expect(api.listMediaSince).toHaveBeenCalled();
  });

  it('pede as métricas por tipo e grava um retrato novo de cada post (vazio vira null)', async () => {
    await service().getReport({}, NOW, wait);
    expect(api.readMediaInsights).toHaveBeenCalledWith('r1', 'token', [...REELS_METRICS]);
    expect(api.readMediaInsights).toHaveBeenCalledWith('f1', 'token', [...FEED_METRICS]);
    const r1 = saved().find((row) => row.mediaId === 'r1')!;
    expect(r1).toMatchObject({ igUserId: 'ig-1', collectedAt: NOW, views: 100, reach: 80, shares: null, likes: 9, comments: 2 });
    expect(r1.unavailable).toContain('shares');
    expect(r1.unavailable).not.toContain('likes');
    // A foto não tem comments_count: fica indisponível
    expect(saved().find((row) => row.mediaId === 'f1')!.unavailable).toContain('comments');
  });

  it('métrica recusada: refaz uma a uma e registra a que falhou', async () => {
    api.listMediaSince.mockResolvedValue({ media: [reel], complete: true });
    api.readMediaInsights.mockImplementation((_id: string, _t: string, metrics: string[]) => {
      if (metrics.includes('reels_skip_rate')) return Promise.reject(new InstagramApiError('metric not supported', 400, 100));
      return Promise.resolve({ values: { [metrics[0]]: 7 }, usagePercent: 5 });
    });
    await service().getReport({}, NOW, wait);
    const row = saved()[0];
    expect(row.skipRate).toBeNull();
    expect(row.shares).toBe(7);
    expect(row.unavailable).toEqual(['reels_skip_rate']);
  });

  it('token recusado marca a conta para reconectar', async () => {
    api.readMediaInsights.mockRejectedValue(new InstagramApiError('expired', 400, 190));
    const r = await service().getReport({}, NOW, wait);
    expect(r.status).toBe('sem-conta');
    expect(prisma.instagramAccount.update).toHaveBeenCalledWith({ where: { id: 'conta-1' }, data: { tokenInvalidAt: NOW } });
  });

  it('sem a permissão de insights explica o que fazer', async () => {
    api.readMediaInsights.mockRejectedValue(new InstagramApiError('(#10) Application does not have permission', 400, 10));
    const r = await service().getReport({}, NOW, wait);
    expect(r.status).toBe('sem-permissao');
    expect(r.avisos[0]).toMatch(/instagram_business_manage_insights/);
  });

  it('limite da Meta: espera, tenta 1 vez e, se continuar, para e grava o que leu', async () => {
    api.listMediaSince.mockResolvedValue({ media: [reel, foto], complete: true });
    api.readMediaInsights
      .mockResolvedValueOnce({ values: { views: 1 }, usagePercent: 10 })
      .mockRejectedValue(new InstagramApiError('limit', 400, 4));
    const r = await service().getReport({}, NOW, wait);
    expect(wait).toHaveBeenCalled();
    expect(saved()).toHaveLength(1);
    expect(r.avisos.join(' ')).toMatch(/Limite de chamadas da Meta/);
  });

  it('uso do limite alto (cabeçalho) interrompe a coleta', async () => {
    api.readMediaInsights.mockResolvedValue({ values: { views: 1 }, usagePercent: 95 });
    const r = await service().getReport({}, NOW, wait);
    expect(prisma.postMetric.createMany).not.toHaveBeenCalled();
    expect(r.avisos.join(' ')).toMatch(/Limite de chamadas/);
  });

  it('Meta fora do ar com coleta antiga: usa a antiga e avisa', async () => {
    prisma.postMetric.findFirst.mockResolvedValue({ collectedAt: new Date(NOW.getTime() - 10 * HOUR) });
    api.listMediaSince.mockRejectedValue(new InstagramApiError('Sem resposta da Meta', 0));
    const r = await service().getReport({}, NOW, wait);
    expect(r.status).toBe('ok');
    expect(r.avisos[0]).toMatch(/Não deu para coletar agora \(Sem resposta da Meta\)/);
  });

  it('filtra o banco pelo período e pelo tipo, com o último retrato de cada post', async () => {
    prisma.postMetric.findFirst.mockResolvedValue({ collectedAt: NOW });
    await service().getReport({ days: 7, type: 'REELS' }, NOW, wait);
    expect(prisma.postMetric.findMany).toHaveBeenCalledWith({
      where: { igUserId: 'ig-1', publishedAt: { gte: new Date('2026-10-24T12:00:00Z') }, productType: 'REELS' },
      orderBy: [{ mediaId: 'asc' }, { collectedAt: 'desc' }],
      distinct: ['mediaId'],
    });
  });
});

describe('usagePercent', () => {
  it('pega o maior uso entre X-App-Usage e X-Business-Use-Case-Usage', () => {
    const headers = new Headers({
      'x-app-usage': JSON.stringify({ call_count: 12, total_cputime: 3, total_time: 5 }),
      'x-business-use-case-usage': JSON.stringify({ '123': [{ type: 'instagram', call_count: 40, total_cputime: 71, total_time: 2 }] }),
    });
    expect(usagePercent(headers)).toBe(71);
  });

  it('sem cabeçalho ou ilegível: null', () => {
    expect(usagePercent(new Headers())).toBeNull();
    expect(usagePercent(new Headers({ 'x-app-usage': 'não é json' }))).toBeNull();
  });
});
