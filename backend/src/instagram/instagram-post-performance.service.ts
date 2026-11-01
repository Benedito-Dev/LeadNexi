import { Injectable, Logger } from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InstagramApiClient,
  InstagramApiError,
  type MediaForPerformance,
} from './instagram-api.client.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import {
  buildPerformanceReport,
  type PerformanceSort,
  type PerformanceSummary,
  type PerformanceType,
  type PostSnapshot,
  type RankedPost,
} from './post-performance.metrics.js';

export const MAX_PERFORMANCE_DAYS = 90;
export const DEFAULT_PERFORMANCE_DAYS = 30;
export const DEFAULT_PERFORMANCE_LIMIT = 10;
export const MAX_PERFORMANCE_LIMIT = 50;

/**
 * Métricas pedidas à Meta por tipo de post (Instagram API com login do Instagram, v25). Uma
 * métrica que não serve para o tipo derruba a chamada inteira, por isso a lista é por tipo.
 * Fora de propósito: plays, clips_replays_count, impressions e video_views (descontinuadas);
 * total_views, crossposted_views e facebook_views (só no login pelo Facebook).
 */
export const REELS_METRICS = [
  'views',
  'reach',
  'likes',
  'comments',
  'shares',
  'saved',
  'total_interactions',
  'reposts',
  'ig_reels_avg_watch_time',
  'ig_reels_video_view_total_time',
  'reels_skip_rate',
] as const;
export const FEED_METRICS = ['views', 'reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions', 'reposts'] as const;

/** Coleta mais nova que isso é devolvida do banco, sem chamar a Meta */
const CACHE_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Posts lidos ao mesmo tempo na Meta */
const CONCURRENCY = 4;
/** Uso do limite da Meta (%) a partir do qual a coleta para de pedir mais posts */
const USAGE_STOP_PERCENT = 85;
/** Espera antes de repetir uma chamada recusada por limite */
const RATE_LIMIT_WAIT_MS = 2_000;

const RECONNECT = 'O Instagram não está conectado ou a conexão venceu: reconecte o Instagram no LeadNexi (Configurações › Canais › Instagram).';
const NO_PERMISSION =
  'O token do Instagram não tem a permissão instagram_business_manage_insights. Reconecte o Instagram no LeadNexi para aceitar a permissão nova (a conta precisa ter papel no app da Meta enquanto o app não passa pela análise).';

export interface PostPerformanceQuery {
  days?: number;
  type?: PerformanceType;
  sortBy?: PerformanceSort;
  limit?: number;
  refresh?: boolean;
}

export interface PostPerformanceReport {
  status: 'ok' | 'sem-conta' | 'sem-permissao' | 'falha';
  resumo: PerformanceSummary | null;
  ranking: RankedPost[];
  avisos: string[];
}

/** Um post lido na Meta, pronto para virar linha de post_metrics */
type Collected = Omit<PostSnapshot, 'collectedAt'>;

/** Parar a coleta inteira (limite da Meta): o que já foi lido é gravado */
class StopCollection extends Error {}

/**
 * Ranking de desempenho dos posts e Reels (rota GET /instagram/insights/posts e ferramenta MCP
 * ver_desempenho_posts). Cada coleta lê na Meta os posts dos últimos 90 dias e grava um retrato
 * de cada um em post_metrics (histórico, nunca sobrescreve); o pedido só filtra e ordena.
 */
@Injectable()
export class InstagramPostPerformanceService {
  private readonly logger = new Logger(InstagramPostPerformanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  async getReport(query: PostPerformanceQuery, now = new Date(), wait = sleep): Promise<PostPerformanceReport> {
    const days = clamp(query.days ?? DEFAULT_PERFORMANCE_DAYS, 1, MAX_PERFORMANCE_DAYS);
    const limit = clamp(query.limit ?? DEFAULT_PERFORMANCE_LIMIT, 1, MAX_PERFORMANCE_LIMIT);
    const type = query.type ?? 'TODOS';
    const sortBy = query.sortBy ?? 'views';
    const avisos: string[] = [];

    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) return failure('sem-conta', RECONNECT);

    const last = await this.prisma.postMetric.findFirst({
      where: { igUserId: account.igUserId },
      orderBy: { collectedAt: 'desc' },
      select: { collectedAt: true },
    });
    const fresh = last && now.getTime() - last.collectedAt.getTime() < CACHE_MS;

    if (fresh && !query.refresh) {
      avisos.push(`Dados do banco, coletados em ${formatFortaleza(last.collectedAt)} (a coleta vale 6 h; use forcar_atualizacao para ler de novo na Meta).`);
    } else {
      try {
        const token = decryptSecret(account.accessToken, this.settings.requireKey());
        avisos.push(...(await this.collect(account.igUserId, token, now, wait)));
      } catch (error) {
        if (error instanceof InstagramApiError && error.invalidToken) {
          await this.prisma.instagramAccount.update({ where: { id: account.id }, data: { tokenInvalidAt: now } });
          return failure('sem-conta', RECONNECT);
        }
        if (error instanceof InstagramApiError && error.missingPermission) return failure('sem-permissao', NO_PERMISSION);
        this.logger.warn(`Desempenho dos posts não coletado: ${(error as Error).message}`);
        const motivo = (error as Error).message;
        if (!last) return failure('falha', `Não deu para coletar os números agora (${motivo}) e ainda não há coleta guardada. Tente de novo em alguns minutos.`);
        avisos.push(`Não deu para coletar agora (${motivo}); números da última coleta, de ${formatFortaleza(last.collectedAt)}.`);
      }
    }

    const snapshots = await this.latestSnapshots(account.igUserId, new Date(now.getTime() - days * DAY_MS), type);
    const report = buildPerformanceReport(snapshots, sortBy, limit, now);

    const missing = new Set(snapshots.flatMap((s) => s.unavailable));
    if (missing.size) {
      avisos.push(`Métricas que a Meta não deu para alguns posts (ficam null, não zero): ${[...missing].sort().join(', ')}.`);
    }
    if (sortBy === 'reels_skip_rate') avisos.push('reels_skip_rate: menor é melhor, o ranking começa pela menor taxa de pulo.');
    if (report.ranking.some((p) => p.maturando)) avisos.push('Posts com menos de 48 h ("maturando") ainda estão ganhando alcance; a Meta também pode atrasar os números em até 48 h.');

    return { status: 'ok', ...report, avisos };
  }

  /** Último retrato de cada post publicado desde `since`, do tipo pedido. */
  private async latestSnapshots(igUserId: string, since: Date, type: PerformanceType): Promise<PostSnapshot[]> {
    return this.prisma.postMetric.findMany({
      where: { igUserId, publishedAt: { gte: since }, ...(type === 'TODOS' ? {} : { productType: type }) },
      orderBy: [{ mediaId: 'asc' }, { collectedAt: 'desc' }],
      distinct: ['mediaId'],
    });
  }

  /** Lê na Meta os posts dos últimos 90 dias e grava um retrato de cada. Devolve os avisos. */
  private async collect(igUserId: string, token: string, now: Date, wait: (ms: number) => Promise<void>): Promise<string[]> {
    const avisos: string[] = [];
    const { media, complete } = await this.api.listMediaSince(token, new Date(now.getTime() - MAX_PERFORMANCE_DAYS * DAY_MS));
    if (!complete) avisos.push('O perfil tem posts demais no período: só os mais recentes foram lidos.');

    const rows: Collected[] = [];
    let stopped = false;
    let next = 0;
    const worker = async () => {
      while (!stopped && next < media.length) {
        const item = media[next++];
        try {
          rows.push(await this.readPost(item, token, wait));
        } catch (error) {
          if (error instanceof StopCollection) {
            stopped = true;
            return;
          }
          throw error;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (rows.length) {
      await this.prisma.postMetric.createMany({ data: rows.map((row) => ({ ...row, igUserId, collectedAt: now })) });
    }
    if (stopped) {
      avisos.push(`Limite de chamadas da Meta perto do fim: ${media.length - rows.length} de ${media.length} posts ficaram com os números da coleta anterior (se houver). Tente de novo em 1 hora.`);
    }
    return avisos;
  }

  /** Estatísticas de um post. Token e permissão sobem (param tudo); o resto vira métrica indisponível. */
  private async readPost(item: MediaForPerformance, token: string, wait: (ms: number) => Promise<void>): Promise<Collected> {
    const metrics: readonly string[] = item.productType === 'REELS' ? REELS_METRICS : FEED_METRICS;
    let values: Record<string, number>;
    const failed: string[] = [];

    try {
      values = { ...(await this.readInsights(item.id, token, [...metrics], wait)) };
    } catch (error) {
      if (isFatal(error)) throw error;
      // Uma métrica recusada derruba a chamada: pede uma a uma para salvar as outras
      values = {};
      for (const metric of metrics) {
        try {
          Object.assign(values, await this.readInsights(item.id, token, [metric], wait));
        } catch (inner) {
          if (isFatal(inner)) throw inner;
          failed.push(metric);
        }
      }
      if (failed.length) this.logger.warn(`Post ${item.id}: Meta recusou ${failed.join(', ')}`);
    }

    // Curtidas e comentários também vêm nos campos do post: servem de reserva
    if (values.likes === undefined && item.likes !== null) values.likes = item.likes;
    if (values.comments === undefined && item.comments !== null) values.comments = item.comments;
    const of = (metric: string) => values[metric] ?? null;
    return {
      mediaId: item.id,
      mediaType: item.mediaType,
      productType: item.productType,
      caption: item.caption,
      permalink: item.permalink,
      publishedAt: item.timestamp,
      views: of('views'),
      reach: of('reach'),
      likes: of('likes'),
      comments: of('comments'),
      shares: of('shares'),
      saved: of('saved'),
      totalInteractions: of('total_interactions'),
      reposts: of('reposts'),
      avgWatchTimeMs: of('ig_reels_avg_watch_time'),
      viewTotalTimeMs: of('ig_reels_video_view_total_time'),
      skipRate: of('reels_skip_rate'),
      unavailable: metrics.filter((m) => values[m] === undefined),
    };
  }

  /** Uma chamada de estatística com freio: limite estourado espera e tenta 1 vez; uso alto para a coleta. */
  private async readInsights(mediaId: string, token: string, metrics: string[], wait: (ms: number) => Promise<void>) {
    let reading;
    try {
      reading = await this.api.readMediaInsights(mediaId, token, metrics);
    } catch (error) {
      if (!(error instanceof InstagramApiError && error.rateLimited)) throw error;
      await wait(RATE_LIMIT_WAIT_MS);
      try {
        reading = await this.api.readMediaInsights(mediaId, token, metrics);
      } catch (again) {
        if (again instanceof InstagramApiError && again.rateLimited) throw new StopCollection();
        throw again;
      }
    }
    if (reading.usagePercent !== null && reading.usagePercent >= USAGE_STOP_PERCENT) {
      this.logger.warn(`Uso do limite da Meta em ${reading.usagePercent}%: coleta interrompida`);
      throw new StopCollection();
    }
    return reading.values;
  }
}

/** Erros que não adianta tentar métrica a métrica */
function isFatal(error: unknown) {
  return (
    error instanceof StopCollection ||
    (error instanceof InstagramApiError && (error.invalidToken || error.missingPermission || error.rateLimited || error.status === 0))
  );
}

function failure(status: PostPerformanceReport['status'], message: string): PostPerformanceReport {
  return { status, resumo: null, ranking: [], avisos: [message] };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function formatFortaleza(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' }).format(date);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
