import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { LeadListsService } from '../lead-lists/lead-lists.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MessagingProfile } from './instagram-api.client.js';

/** Origem dos leads que chegam pelo Instagram (a mesma do formulário de lead) */
export const INSTAGRAM_SOURCE = 'Instagram';
/** Nome do lead quando a Meta não informa nome nem @ */
export const UNKNOWN_CONTACT = 'Contato do Instagram';

/**
 * Quem fala com a conta no Instagram (direct ou comentário com automação) e ainda não é lead
 * vira um, ligado pelo ID da pessoa no Instagram (IGSID). Um lugar só para os dois caminhos não
 * criarem a mesma pessoa duas vezes.
 */
@Injectable()
export class InstagramLeadsService {
  private readonly logger = new Logger(InstagramLeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadLists: LeadListsService,
  ) {}

  /**
   * Lead novo no fim da primeira etapa do primeiro funil, com "Criado" no histórico logo antes
   * do primeiro contato. Se outro aviso da mesma pessoa criou o lead ao mesmo tempo, usa ele.
   * Sem funil (nenhuma etapa): null, não há onde pôr o lead.
   */
  async create(
    instagramUserId: string,
    profile: MessagingProfile | null,
    firstContactAt: Date,
  ): Promise<{ lead: { id: string }; created: boolean } | null> {
    const stage = await this.prisma.stage.findFirst({
      orderBy: [
        { pipeline: { position: 'asc' } },
        { pipeline: { createdAt: 'asc' } },
        { position: 'asc' },
      ],
      select: { id: true, name: true },
    });
    if (!stage) {
      this.logger.warn(
        'Contato do Instagram recebido, mas não há etapa no funil para o lead',
      );
      return null;
    }

    const name =
      profile?.name ??
      (profile?.username ? `@${profile.username}` : UNKNOWN_CONTACT);
    const list = await this.leadLists.defaultList();
    try {
      const lead = await this.prisma.lead.create({
        data: {
          name: name.slice(0, 120),
          source: INSTAGRAM_SOURCE,
          instagramUserId,
          instagramUsername: profile?.username ?? null,
          stageId: stage.id,
          listId: list.id,
          position: await this.prisma.lead.count({
            where: { stageId: stage.id, archived: false },
          }),
          activities: {
            create: {
              type: 'CREATED',
              text: INSTAGRAM_SOURCE,
              toStage: stage.name,
              // 1 ms antes do contato: no histórico, "criado" vem antes dele
              createdAt: new Date(firstContactAt.getTime() - 1),
            },
          },
        },
        select: { id: true },
      });
      return { lead, created: true };
    } catch (error) {
      // Dois avisos da mesma pessoa chegando juntos: o outro criou o lead
      if (!isUniqueViolation(error)) throw error;
      const lead = await this.prisma.lead.findUnique({
        where: { instagramUserId },
        select: { id: true },
      });
      return lead ? { lead, created: false } : null;
    }
  }
}

export function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
