import { Injectable, Logger } from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';
import { PUBLISHED_IN_LIST } from './instagram-posts.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** Folga entre a hora do post no Instagram e o `publishedAt` gravado no LeadNexi */
const CLOCK_MARGIN_MS = 60 * 60 * 1000;
/** Publicado há menos que isso ainda pode não aparecer na lista da Meta: não conta como apagado */
const FRESH_MS = 5 * 60 * 1000;

export interface SyncResult {
  /** Publicados que não estão mais no perfil (viraram "Removido do Instagram") */
  removed: number;
  /** Removidos que voltaram ao perfil (ex.: tirados do arquivo) */
  restored: number;
  /** Por que não conferiu (sem conta, token recusado, Meta fora do ar) */
  skipped?: string;
}

/**
 * Confere os publicados com o perfil do Instagram: o que foi apagado (ou arquivado) lá vira
 * "Removido do Instagram" aqui, e volta a "Publicado" se reaparecer. A Meta não avisa quando um
 * post é apagado, então a tela pede a conferência ao abrir, e o cron diário confere também.
 */
@Injectable()
export class InstagramSyncService {
  private readonly logger = new Logger(InstagramSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  async syncPublished(now = new Date()): Promise<SyncResult> {
    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) return { removed: 0, restored: 0, skipped: 'sem conta' };

    // Os mesmos que a lista mostra
    const tracked = await this.prisma.instagramPost.findMany({
      where: {
        status: { in: ['PUBLISHED', 'REMOVED'] },
        igMediaId: { not: null },
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: PUBLISHED_IN_LIST,
      select: { id: true, status: true, igMediaId: true, publishedAt: true },
    });
    if (tracked.length === 0) return { removed: 0, restored: 0 };

    const oldest = tracked.at(-1)!.publishedAt!;
    let profile: Awaited<ReturnType<InstagramApiClient['listProfileMedia']>>;
    try {
      const token = decryptSecret(
        account.accessToken,
        this.settings.requireKey(),
      );
      profile = await this.api.listProfileMedia(
        token,
        new Date(oldest.getTime() - CLOCK_MARGIN_MS),
      );
    } catch (error) {
      if (error instanceof InstagramApiError && error.invalidToken) {
        // A tela passa a mostrar "Conexão expirada" e pedir para conectar de novo
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: { tokenInvalidAt: now },
        });
      }
      this.logger.warn(
        `Posts não conferidos com o Instagram: ${(error as Error).message}`,
      );
      return { removed: 0, restored: 0, skipped: 'falha na Meta' };
    }

    // Lista incompleta (perfil grande): só confere o que ela cobre
    const coveredFrom = profile.complete
      ? null
      : (profile.oldest?.getTime() ?? Infinity) + CLOCK_MARGIN_MS;
    const removed: string[] = [];
    const restored: string[] = [];
    for (const post of tracked) {
      const onProfile = profile.ids.has(post.igMediaId!);
      const published = post.publishedAt!.getTime();
      if (post.status === 'REMOVED' && onProfile) restored.push(post.id);
      if (
        post.status === 'PUBLISHED' &&
        !onProfile &&
        published < now.getTime() - FRESH_MS &&
        (coveredFrom === null || published >= coveredFrom)
      ) {
        removed.push(post.id);
      }
    }

    const [gone, back] = await this.prisma.$transaction([
      this.prisma.instagramPost.updateMany({
        where: { id: { in: removed }, status: 'PUBLISHED' },
        data: { status: 'REMOVED' },
      }),
      this.prisma.instagramPost.updateMany({
        where: { id: { in: restored }, status: 'REMOVED' },
        data: { status: 'PUBLISHED' },
      }),
    ]);
    if (gone.count || back.count) {
      this.logger.log(
        `Conferência com o Instagram: ${gone.count} removido(s), ${back.count} de volta`,
      );
    }
    return { removed: gone.count, restored: back.count };
  }
}
