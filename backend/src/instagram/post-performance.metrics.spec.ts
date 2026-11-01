import {
  buildPerformanceReport,
  deriveMetrics,
  isMaturing,
  median,
  type PostSnapshot,
  rankPosts,
  ratio,
  referenceReach,
  toRankedPost,
} from './post-performance.metrics.js';

const NOW = new Date('2026-10-31T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);

const post = (over: Partial<PostSnapshot> = {}): PostSnapshot => ({
  mediaId: 'm',
  collectedAt: NOW,
  mediaType: 'VIDEO',
  productType: 'REELS',
  caption: 'Legenda',
  permalink: 'https://instagram.com/reel/x',
  publishedAt: daysAgo(10),
  views: 1000,
  reach: 800,
  likes: 50,
  comments: 5,
  shares: 20,
  saved: 10,
  totalInteractions: 80,
  reposts: 1,
  avgWatchTimeMs: 7_450,
  viewTotalTimeMs: 600_000,
  skipRate: 40,
  unavailable: [],
  ...over,
});

describe('métricas de desempenho dos posts', () => {
  it('mediana com quantidade par, ímpar e vazia', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('razão é null sem dado ou com divisor zero (nunca vira 0 nem Infinity)', () => {
    expect(ratio(20, 800)).toBe(0.025);
    expect(ratio(null, 800)).toBeNull();
    expect(ratio(20, null)).toBeNull();
    expect(ratio(20, 0)).toBeNull();
    expect(ratio(1, 3)).toBe(0.3333);
  });

  it('taxas sobre o alcance e dias desde a publicação', () => {
    expect(deriveMetrics(post(), 400, NOW)).toEqual({
      taxa_engajamento: 0.1,
      taxa_compartilhamento: 0.025,
      taxa_salvamento: 0.0125,
      alcance_vs_mediana: 2,
      dias_desde_publicacao: 10,
    });
  });

  it('métrica indisponível deixa a taxa dela null', () => {
    const d = deriveMetrics(post({ shares: null, reach: null }), 400, NOW);
    expect(d.taxa_compartilhamento).toBeNull();
    expect(d.taxa_engajamento).toBeNull();
    expect(d.alcance_vs_mediana).toBeNull();
  });

  it('maturando: menos de 48 h desde a publicação', () => {
    expect(isMaturing(new Date(NOW.getTime() - 47 * 3600_000), NOW)).toBe(true);
    expect(isMaturing(new Date(NOW.getTime() - 49 * 3600_000), NOW)).toBe(false);
  });

  it('mediana de referência ignora posts maturando, salvo se só houver eles', () => {
    const maduros = [post({ reach: 100 }), post({ reach: 300 })];
    const novo = post({ reach: 5, publishedAt: daysAgo(0.5) });
    expect(referenceReach([...maduros, novo], NOW)).toBe(200);
    expect(referenceReach([novo], NOW)).toBe(5);
    expect(referenceReach([post({ reach: null })], NOW)).toBeNull();
  });

  it('destaque só acima de 2x a mediana', () => {
    expect(toRankedPost(post({ reach: 801 }), 400, NOW).destaque).toBe(true);
    expect(toRankedPost(post({ reach: 800 }), 400, NOW).destaque).toBe(false);
  });

  it('post montado: legenda em 150 caracteres, tempos em s/min, tipo carrossel', () => {
    const r = toRankedPost(post({ caption: 'a'.repeat(300), mediaType: 'CAROUSEL_ALBUM', productType: 'FEED' }), 400, NOW);
    expect(r.legenda).toHaveLength(150);
    expect(r.tipo).toBe('CARROSSEL');
    expect(r.metricas.tempo_medio_assistido_s).toBe(7.5);
    expect(r.metricas.tempo_total_assistido_min).toBe(10);
    expect(r).not.toHaveProperty('metricas_indisponiveis');
  });

  it('ranking põe quem não tem o dado no fim; taxa de pulo ordena do menor', () => {
    const a = toRankedPost(post({ mediaId: 'a', views: 10, skipRate: 60 }), null, NOW);
    const b = toRankedPost(post({ mediaId: 'b', views: null, skipRate: null }), null, NOW);
    const c = toRankedPost(post({ mediaId: 'c', views: 30, skipRate: 20 }), null, NOW);
    expect(rankPosts([a, b, c], 'views').map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(rankPosts([a, b, c], 'reels_skip_rate').map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('relatório: resumo, limite e pior ignorando post maturando', () => {
    const posts = [
      post({ mediaId: 'top', views: 5000, reach: 4000 }),
      post({ mediaId: 'meio', views: 1000, reach: 800 }),
      post({ mediaId: 'fraco', views: 200, reach: 150 }),
      post({ mediaId: 'novo', views: 50, reach: 40, publishedAt: daysAgo(0.2) }),
    ];
    const { resumo, ranking } = buildPerformanceReport(posts, 'views', 2, NOW);
    expect(resumo.total_posts).toBe(4);
    expect(resumo.mediana_views).toBe(600);
    expect(resumo.mediana_reach).toBe(800);
    expect(resumo.melhor).toMatchObject({ id: 'top', valor: 5000 });
    expect(resumo.pior).toMatchObject({ id: 'fraco', valor: 200 });
    expect(ranking.map((p) => p.id)).toEqual(['top', 'meio']);
    expect(ranking[0].destaque).toBe(true);
  });

  it('relatório vazio', () => {
    const { resumo, ranking } = buildPerformanceReport([], 'views', 10, NOW);
    expect(resumo).toMatchObject({ total_posts: 0, mediana_views: null, melhor: null, pior: null });
    expect(ranking).toEqual([]);
  });
});
