import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { changedPositions } from '../common/utils/positions.js';
import { PipelinesService } from '../pipelines/pipelines.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStageDto } from './dto/create-stage.dto.js';
import { ReorderStagesDto } from './dto/reorder-stages.dto.js';
import { UpdateStageDto } from './dto/update-stage.dto.js';

@Injectable()
export class StagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelinesService: PipelinesService,
  ) {}

  /** Cria a etapa no fim do pipeline. */
  async create(pipelineId: string, dto: CreateStageDto) {
    await this.pipelinesService.ensureExists(pipelineId);
    const position = await this.prisma.stage.count({ where: { pipelineId } });
    return this.prisma.stage.create({
      data: { ...dto, pipelineId, position },
    });
  }

  async update(id: string, dto: UpdateStageDto) {
    await this.findOrFail(id);
    return this.prisma.stage.update({ where: { id }, data: dto });
  }

  /** Aplica a nova ordem das colunas. A lista precisa conter todas as etapas do pipeline. */
  async reorder(pipelineId: string, { stageIds }: ReorderStagesDto) {
    await this.pipelinesService.ensureExists(pipelineId);
    const current = await this.prisma.stage.findMany({
      where: { pipelineId },
      select: { id: true, position: true },
    });

    const currentIds = new Set(current.map((stage) => stage.id));
    const sameSet =
      stageIds.length === currentIds.size &&
      stageIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        'stageIds deve conter exatamente todas as etapas do pipeline',
      );
    }

    const changes = changedPositions(current, stageIds);
    await this.prisma.$transaction(
      changes.map(({ id, position }) =>
        this.prisma.stage.update({ where: { id }, data: { position } }),
      ),
    );

    return this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  /** Remove a etapa. Bloqueado se ainda houver leads nela. */
  async remove(id: string) {
    const stage = await this.findOrFail(id);
    const leadCount = await this.prisma.lead.count({ where: { stageId: id } });
    if (leadCount > 0) {
      throw new ConflictException(
        `A etapa possui ${leadCount} lead(s). Mova os leads antes de removê-la.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stage.delete({ where: { id } });
      const remaining = await tx.stage.findMany({
        where: { pipelineId: stage.pipelineId },
        select: { id: true, position: true },
      });
      const ordered = [...remaining]
        .sort((a, b) => a.position - b.position)
        .map((row) => row.id);
      await Promise.all(
        changedPositions(remaining, ordered).map(({ id: stageId, position }) =>
          tx.stage.update({ where: { id: stageId }, data: { position } }),
        ),
      );
    });
  }

  async findOrFail(id: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Etapa não encontrada');
    return stage;
  }
}
