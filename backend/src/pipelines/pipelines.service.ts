import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { changedPositions } from '../common/utils/positions.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePipelineDto } from './dto/create-pipeline.dto.js';
import { UpdatePipelineDto } from './dto/update-pipeline.dto.js';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.pipeline.findMany({
      orderBy: { position: 'asc' },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  /** Pipeline completo para montar o Kanban: etapas + leads, tudo ordenado. */
  async findBoard(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { leads: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!pipeline) throw new NotFoundException('Pipeline não encontrado');
    return pipeline;
  }

  async create({ name, stages = [] }: CreatePipelineDto) {
    const position = await this.prisma.pipeline.count();
    return this.prisma.pipeline.create({
      data: {
        name,
        position,
        stages: {
          create: stages.map((stage, index) => ({ ...stage, position: index })),
        },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdatePipelineDto) {
    await this.ensureExists(id);
    return this.prisma.pipeline.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const leadCount = await this.prisma.lead.count({
      where: { stage: { pipelineId: id } },
    });
    if (leadCount > 0) {
      throw new ConflictException(
        `O pipeline possui ${leadCount} lead(s). Mova ou exclua os leads antes de removê-lo.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pipeline.delete({ where: { id } });
      // Mantém as posições dos pipelines restantes contíguas
      const remaining = await tx.pipeline.findMany({
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });
      const ordered = remaining.map((row) => row.id);
      await Promise.all(
        changedPositions(remaining, ordered).map(
          ({ id: pipelineId, position }) =>
            tx.pipeline.update({
              where: { id: pipelineId },
              data: { position },
            }),
        ),
      );
    });
  }

  async ensureExists(id: string) {
    const exists = await this.prisma.pipeline.count({ where: { id } });
    if (!exists) throw new NotFoundException('Pipeline não encontrado');
  }
}
