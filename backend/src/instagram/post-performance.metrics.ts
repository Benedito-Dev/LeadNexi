/**
 * Contas do ranking de desempenho dos posts (ferramenta ver_desempenho_posts). Funções puras:
 * recebem os retratos já lidos do banco e devolvem o relatório, sem Meta nem Prisma.
 */

export const PERFORMANCE_TYPES = ['REELS', 'FEED', 'TODOS'] as const;
export type PerformanceType = (typeof PERFORMANCE_TYPES)[number];

export const PERFORMANCE_SORTS = [
  'views',
  'reach',
  'shares',
  'saved',
  'taxa_engajamento',
  'taxa_compartilhamento',
  'reels_skip_rate',
] as const;
export type PerformanceSort = (typeof PERFORMANCE_SORTS)[number];

/** Post com menos que isso de vida ainda está ganhando alcance: não entra em mediana nem em "pior" */
export const MATURING_HOURS = 48;
/** Alcance acima de tantas vezes a mediana do período = destaque */
export const HIGHLIGHT_FACTOR = 2;
const CAPTION_PREVIEW = 150;
const HOUR_MS = 60 * 60 * 1000;

/** Um retrato do post (linha de post_metrics) */
export interface PostSnapshot {
  mediaId: string;
  collectedAt: Date;
  mediaType: string;
  productType: string;
  caption: string | null;
  permalink: string | null;
  publishedAt: Date;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saved: number | null;
  totalInteractions: number | null;
  reposts: number | null;
  avgWatchTimeMs: number | null;
  viewTotalTimeMs: number | null;
  skipRate: number | null;
  unavailable: string[];
}

export interface DerivedMetrics {
  taxa_engajamento: number | null;
  taxa_compartilhamento: number | null;
  taxa_salvamento: number | null;
  alcance_vs_mediana: number | null;
  dias_desde_publicacao: number;
}

export interface RankedPost {
  id: string;
  permalink: string | null;
  data: string;
  tipo: string;
  legenda: string | null;
  metricas: {
    views: number | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saved: number | null;
    total_interactions: number | null;
    reposts: number | null;
    tempo_medio_assistido_s: number | null;
    tempo_total_assistido_min: number | null;
    reels_skip_rate: number | null;
  };
  derivadas: DerivedMetrics;
  destaque: boolean;
  maturando: boolean;
  metricas_indisponiveis?: string[];
  coletado_em: string;
}

export interface PerformanceSummary {
  total_posts: number;
  mediana_views: number | null;
  mediana_reach: number | null;
  criterio: PerformanceSort;
  melhor: { id: string; permalink: string | null; valor: number } | null;
  pior: { id: string; permalink: string | null; valor: number } | null;
}

/** Mediana; null sem valores. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Razão com 4 casas; null quando falta um dos lados ou o divisor é 0 (sem alcance, sem taxa). */
export function ratio(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 10_000) / 10_000;
}

export function isMaturing(publishedAt: Date, now: Date) {
  return now.getTime() - publishedAt.getTime() < MATURING_HOURS * HOUR_MS;
}

/**
 * Mediana do alcance usada em alcance_vs_mediana. Ignora os posts maturando (ainda com
 * alcance baixo, puxariam a mediana para baixo); se só houver posts maturando, usa todos.
 */
export function referenceReach(posts: PostSnapshot[], now: Date): number | null {
  const withReach = posts.filter((p) => p.reach !== null);
  const mature = withReach.filter((p) => !isMaturing(p.publishedAt, now));
  return median((mature.length ? mature : withReach).map((p) => p.reach as number));
}

export function deriveMetrics(post: PostSnapshot, medianReach: number | null, now: Date): DerivedMetrics {
  return {
    taxa_engajamento: ratio(post.totalInteractions, post.reach),
    taxa_compartilhamento: ratio(post.shares, post.reach),
    taxa_salvamento: ratio(post.saved, post.reach),
    alcance_vs_mediana: ratio(post.reach, medianReach),
    dias_desde_publicacao: Math.floor((now.getTime() - post.publishedAt.getTime()) / (24 * HOUR_MS)),
  };
}

/** Valor do critério de ordenação de um post já montado (null = sem dado). */
export function sortValue(post: RankedPost, by: PerformanceSort): number | null {
  switch (by) {
    case 'taxa_engajamento':
    case 'taxa_compartilhamento':
      return post.derivadas[by];
    default:
      return post.metricas[by];
  }
}

/** Taxa de pulo: menor é melhor. Os outros critérios: maior é melhor. */
export const lowerIsBetter = (by: PerformanceSort) => by === 'reels_skip_rate';

/** Ordena do melhor para o pior; post sem o dado vai para o fim (não vale como zero). */
export function rankPosts(posts: RankedPost[], by: PerformanceSort): RankedPost[] {
  const sign = lowerIsBetter(by) ? 1 : -1;
  return [...posts].sort((a, b) => {
    const va = sortValue(a, by);
    const vb = sortValue(b, by);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return sign * (va - vb);
  });
}

export function toRankedPost(post: PostSnapshot, medianReach: number | null, now: Date): RankedPost {
  const derived = deriveMetrics(post, medianReach, now);
  const maturing = isMaturing(post.publishedAt, now);
  const caption = post.caption?.trim() ?? null;
  return {
    id: post.mediaId,
    permalink: post.permalink,
    data: post.publishedAt.toISOString(),
    tipo: post.productType === 'REELS' ? 'REELS' : post.mediaType === 'CAROUSEL_ALBUM' ? 'CARROSSEL' : 'FEED',
    legenda: caption ? caption.slice(0, CAPTION_PREVIEW) : null,
    metricas: {
      views: post.views,
      reach: post.reach,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saved: post.saved,
      total_interactions: post.totalInteractions,
      reposts: post.reposts,
      tempo_medio_assistido_s: post.avgWatchTimeMs === null ? null : Math.round(post.avgWatchTimeMs / 100) / 10,
      tempo_total_assistido_min: post.viewTotalTimeMs === null ? null : Math.round(post.viewTotalTimeMs / 6_000) / 10,
      reels_skip_rate: post.skipRate,
    },
    derivadas: derived,
    destaque: derived.alcance_vs_mediana !== null && derived.alcance_vs_mediana > HIGHLIGHT_FACTOR,
    maturando: maturing,
    ...(post.unavailable.length ? { metricas_indisponiveis: post.unavailable } : {}),
    coletado_em: post.collectedAt.toISOString(),
  };
}

/**
 * Monta resumo + ranking dos posts já filtrados pelo período e tipo. Melhor e pior seguem o
 * critério de ordenação; o pior ignora posts maturando (um post de 3 horas sempre perderia).
 */
export function buildPerformanceReport(
  posts: PostSnapshot[],
  by: PerformanceSort,
  limit: number,
  now: Date,
): { resumo: PerformanceSummary; ranking: RankedPost[] } {
  const medianReach = referenceReach(posts, now);
  const ranked = rankPosts(
    posts.map((p) => toRankedPost(p, medianReach, now)),
    by,
  );
  const withValue = ranked.filter((p) => sortValue(p, by) !== null);
  const best = withValue[0];
  const worst = withValue.filter((p) => !p.maturando).at(-1);
  const pick = (p: RankedPost | undefined) =>
    p ? { id: p.id, permalink: p.permalink, valor: sortValue(p, by) as number } : null;

  return {
    resumo: {
      total_posts: posts.length,
      mediana_views: median(posts.flatMap((p) => (p.views === null ? [] : [p.views]))),
      mediana_reach: medianReach,
      criterio: by,
      melhor: pick(best),
      pior: pick(worst),
    },
    ranking: ranked.slice(0, limit),
  };
}
