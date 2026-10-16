import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  changedPositions,
  insertAt,
  without,
} from '../common/utils/positions.js';
import { LeadListsService } from '../lead-lists/lead-lists.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StagesService } from '../stages/stages.service.js';
import { StorageService } from '../storage/storage.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { MoveLeadDto } from './dto/move-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { avatarKey } from './lead-avatar.js';

const stageSummary = {
  select: { id: true, name: true, pipelineId: true, stageType: true },
} satisfies Prisma.StageDefaultArgs;

const listSummary = {
  select: { id: true, name: true, archived: true },
} satisfies Prisma.LeadListDefaultArgs;

type Tx = Prisma.TransactionClient;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stagesService: StagesService,
    private readonly storage: StorageService,
    private readonly leadLists: LeadListsService,
  ) {}

  async findAll({
    search,
    pipelineId,
    stageId,
    source,
    listId,
    includeArchived = false,
    archived,
    page,
    limit,
  }: QueryLeadsDto) {
    const where: Prisma.LeadWhereInput = {
      stageId,
      source,
      listId,
      archived: archived ?? (includeArchived ? undefined : false),
      list: includeArchived ? undefined : { archived: false },
      stage: pipelineId ? { pipelineId } : undefined,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            {
              instagramUsername: {
                contains: search.replace(/^@/, ''),
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: { stage: stageSummary, list: listSummary },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { stage: stageSummary, list: listSummary },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  /** Cria o lead no fim da coluna informada e registra "Criado" no histórico. */
  async create(dto: CreateLeadDto) {
    const stage = await this.stagesService.findOrFail(dto.stageId);
    const list = dto.listId
      ? await this.leadLists.findOrFail(dto.listId)
      : await this.leadLists.defaultList();
    const position = await this.prisma.lead.count({
      where: { stageId: dto.stageId },
    });
    const { listId: _listId, followUpAt, meetingAt, ...leadData } = dto;
    // Escrita aninhada: lead e evento são gravados juntos (atômico)
    return this.prisma.lead.create({
      data: {
        ...leadData,
        listId: list.id,
        ...(followUpAt ? { followUpAt: new Date(followUpAt) } : {}),
        ...(meetingAt ? { meetingAt: new Date(meetingAt) } : {}),
        position,
        activities: {
          create: {
            type: 'CREATED',
            text: dto.source ?? null,
            toStage: stage.name,
          },
        },
      },
      include: { stage: stageSummary, list: listSummary },
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    const { listId, followUpAt, meetingAt, ...leadData } = dto;
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...leadData,
        ...(listId ? { list: { connect: { id: listId } } } : {}),
        ...(followUpAt !== undefined
          ? { followUpAt: followUpAt ? new Date(followUpAt) : null }
          : {}),
        ...(meetingAt !== undefined
          ? { meetingAt: meetingAt ? new Date(meetingAt) : null }
          : {}),
      },
      include: { stage: stageSummary, list: listSummary },
    });
  }

  /**
   * Move o card para `stageId` na `position` informada (arrastar no Kanban).
   * Reordena a coluna de origem e a de destino na mesma transação; trocar de etapa
   * registra "de → para" no histórico, também na mesma transação.
   */
  async move(id: string, dto: MoveLeadDto) {
    const { stageId, position } = dto;
    const lead = await this.findOne(id);
    const targetStage = await this.stagesService.findOrFail(stageId);
    const lostReason = dto.lostReason?.trim() || null;
    if (targetStage.stageType === 'LOST' && !lostReason) {
      throw new BadRequestException('Informe o motivo ao mover o lead para Perdido.');
    }
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (lead.stageId === stageId) {
        const column = await this.columnOf(tx, stageId);
        const ordered = insertAt(
          without(
            column.map((row) => row.id),
            id,
          ),
          id,
          position,
        );
        await this.applyPositions(tx, column, ordered);
        return;
      }

      const source = await this.columnOf(tx, lead.stageId);
      const target = await this.columnOf(tx, stageId);

      await tx.lead.update({
        where: { id },
        data: {
          stageId,
          lostReason: targetStage.stageType === 'LOST' ? lostReason : null,
          wonAt: targetStage.stageType === 'WON' ? (lead.wonAt ?? now) : null,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId: id,
          type: 'STAGE_CHANGED',
          fromStage: lead.stage.name,
          toStage: targetStage.name,
        },
      });
      await this.applyPositions(
        tx,
        source,
        without(
          source.map((row) => row.id),
          id,
        ),
      );
      await this.applyPositions(
        tx,
        target,
        insertAt(
          target.map((row) => row.id),
          id,
          position,
        ),
      );
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const lead = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.delete({ where: { id } });
      const column = await this.columnOf(tx, lead.stageId);
      await this.applyPositions(
        tx,
        column,
        column.map((row) => row.id),
      );
    });
    // A foto de perfil guardada vai junto (se falhar, fica só um arquivo solto)
    if (lead.avatarId && this.storage.configured) {
      await this.storage
        .deleteMany([avatarKey(lead.avatarId)])
        .catch((error: Error) =>
          this.logger.warn(`Foto do lead ${id} não apagada: ${error.message}`),
        );
    }
  }

  /** Cards de uma coluna, ordenados pela posição atual. */
  private columnOf(tx: Tx, stageId: string) {
    return tx.lead.findMany({
      where: { stageId, archived: false, list: { archived: false } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, position: true },
    });
  }

  /** Grava só as posições que mudaram. Ids fora de `current` são tratados como novos. */
  private async applyPositions(
    tx: Tx,
    current: { id: string; position: number }[],
    orderedIds: string[],
  ) {
    for (const { id, position } of changedPositions(current, orderedIds)) {
      await tx.lead.update({ where: { id }, data: { position } });
    }
  }
}
