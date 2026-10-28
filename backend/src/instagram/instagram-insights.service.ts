import { Injectable, Logger } from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type FollowsInPeriod,
  InstagramApiClient,
  InstagramApiError,
  type MediaWithCounts,
} from './instagram-api.client.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** Períodos aceitos (a Meta soma no máximo 30 dias por chamada) */
export const INSIGHT_PERIODS = [7, 30] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

/** Números da conta no período. Cada um é pedido à parte: o que a Meta não der fica `null` */
const ACCOUNT_METRICS = [
  'reach',
  'views',
  'accounts_engaged',
  'total_interactions',
  'profile_views',
  'website_clicks',
] as const;
type AccountMetric = (typeof ACCOUNT_METRICS)[number];

/** Métricas de todo post; o Reel ganha o tempo médio assistido */
const MEDIA_METRICS = ['views', 'reach', 'saved', 'shares', 'total_interactions'];
const REEL_METRICS = [...MEDIA_METRICS, 'ig_reels_avg_watch_time'];

/** Posts mostrados na tabela (os mais recentes do perfil) */
const POSTS_IN_TABLE = 24;
/** A resposta fica guardada esse tempo: trocar de aba não refaz as ~40 chamadas à Meta */
const CACHE_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Folga para o período ficar dentro do limite de 30 dias da Meta */
const RANGE_MARGIN_MS = 60 * 1000;

export interface PostInsights extends MediaWithCounts {
  views: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  interactions: number | null;
  /** Só Reel: tempo médio assistido, em milissegundos */
  avgWatchMs: number | null;
}

export type ProfileInsights =
  | { status: 'sem-conta' | 'sem-permissao' | 'falha' }
  | {
      status: 'ok';
      days: InsightPeriod;
      followers: number | null;
      /** Cada métrica no período e no período anterior, do mesmo tamanho (para comparar) */
      account: Record<AccountMetric, { current: number | null; previous: number | null }>;
      follows: FollowsInPeriod | null;
      posts: PostInsights[];
    };

/**
 * Estatísticas do Instagram para a aba Desempenho da tela Conteúdo, lidas na hora na Meta
 * (nada fica no banco). Precisa da permissão instagram_business_manage_insights: conta
 * conectada antes dela entrar no login responde `sem-permissao` até conectar de novo.
 */
@Injectable()
export class InstagramInsightsService {
  private readonly logger = new Logger(InstagramInsightsService.name);
  private readonly cache = new Map<string, { at: number; value: ProfileInsights }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  async getInsights(days: InsightPeriod, now = new Date()): Promise<ProfileInsights> {
    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) return { status: 'sem-conta' };

    const key = `${account.id}:${days}`;
    const cached = this.cache.get(key);
    if (cached && now.getTime() - cached.at < CACHE_MS) return cached.value;

    try {
      const token = decryptSecret(account.accessToken, this.settings.requireKey());
      const until = now;
      const since = new Date(now.getTime() - days * DAY_MS + RANGE_MARGIN_MS);
      const before = new Date(since.getTime() - days * DAY_MS + RANGE_MARGIN_MS);

      // A 1ª chamada de estatística diz se a permissão existe: sem ela, nem segue
      const reach = await this.api.getAccountInsight(token, 'reach', since, until);

      const [current, previous, follows, profile, media] = await Promise.all([
        this.accountMetrics(token, since, until),
        this.accountMetrics(token, before, since),
        this.api.getFollowsInPeriod(token, since, until).catch(() => null),
        this.api.getProfileOverview(token, 1),
        this.api.listMediaWithCounts(token, POSTS_IN_TABLE),
      ]);
      current.reach = reach;

      const value: ProfileInsights = {
        status: 'ok',
        days,
        followers: profile.followers,
        account: Object.fromEntries(
          ACCOUNT_METRICS.map((m) => [m, { current: current[m], previous: previous[m] }]),
        ) as Extract<ProfileInsights, { status: 'ok' }>['account'],
        follows,
        posts: await Promise.all(media.map((m) => this.postInsights(token, m))),
      };
      this.cache.set(key, { at: now.getTime(), value });
      return value;
    } catch (error) {
      if (error instanceof InstagramApiError && error.invalidToken) {
        // A tela passa a mostrar "Conexão expirada" e pedir para conectar de novo
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: { tokenInvalidAt: now },
        });
        return { status: 'sem-conta' };
      }
      if (isMissingPermission(error)) return { status: 'sem-permissao' };
      this.logger.warn(`Estatísticas do Instagram não lidas: ${(error as Error).message}`);
      return { status: 'falha' };
    }
  }

  /** Cada métrica numa chamada: uma que a Meta não aceite não derruba as outras. */
  private async accountMetrics(token: string, since: Date, until: Date) {
    const values = await Promise.all(
      ACCOUNT_METRICS.map((metric) =>
        this.api.getAccountInsight(token, metric, since, until).catch(() => null),
      ),
    );
    return Object.fromEntries(ACCOUNT_METRICS.map((m, i) => [m, values[i]])) as Record<
      AccountMetric,
      number | null
    >;
  }

  /** Números de um post. Vídeo antigo que não é Reel recusa o tempo assistido: tenta sem ele. */
  private async postInsights(token: string, media: MediaWithCounts): Promise<PostInsights> {
    const read = (metrics: string[]) => this.api.getMediaInsights(media.id, token, metrics);
    let values: Record<string, number> = {};
    try {
      values = await read(media.type === 'VIDEO' ? REEL_METRICS : MEDIA_METRICS);
    } catch {
      if (media.type === 'VIDEO') values = await read(MEDIA_METRICS).catch(() => ({}));
    }
    const of = (metric: string) => values[metric] ?? null;
    return {
      ...media,
      views: of('views'),
      reach: of('reach'),
      saved: of('saved'),
      shares: of('shares'),
      interactions: of('total_interactions'),
      avgWatchMs: of('ig_reels_avg_watch_time'),
    };
  }
}

/** A Meta recusou por falta de permissão (10 e 200 são os códigos de permissão da Graph API). */
function isMissingPermission(error: unknown) {
  return (
    error instanceof InstagramApiError &&
    (error.code === 10 || error.code === 200 || /permission/i.test(error.message))
  );
}
