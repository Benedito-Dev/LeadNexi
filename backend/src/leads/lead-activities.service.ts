import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto.js';

const stageSummary = {
  select: { id: true, name: true, pipelineId: true },
} satisfies Prisma.StageDefaultArgs;

/** Limite do histórico devolvido de uma vez (os mais recentes). */
const HISTORY_LIMIT = 200;

/**
 * Histórico do lead (anotações e eventos) e o próximo contato agendado (follow-up).
 * Criação e mudança de etapa são registradas pelo LeadsService, na mesma transação do movimento.
 */
@Injectable()
export class LeadActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Histórico do lead, do mais novo para o mais antigo. */
  async list(leadId: string) {
    await this.ensureLead(leadId);
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
  }

  async addNote(leadId: string, { text }: CreateNoteDto) {
    await this.ensureLead(leadId);
    return this.prisma.leadActivity.create({
      data: { leadId, type: 'NOTE', text: text.trim() },
    });
  }

  /** Só anotações podem ser apagadas: eventos do sistema contam a história real do lead. */
  async removeNote(leadId: string, activityId: string) {
    const activity = await this.prisma.leadActivity.findFirst({
      where: { id: activityId, leadId },
    });
    if (!activity) throw new NotFoundException('Anotação não encontrada');
    if (activity.type !== 'NOTE') {
      throw new BadRequestException('Só anotações podem ser apagadas');
    }
    await this.prisma.leadActivity.delete({ where: { id: activityId } });
  }

  /** Agenda (ou reagenda) o próximo contato e registra no histórico. */
  async scheduleFollowUp(leadId: string, { dueAt, note }: ScheduleFollowUpDto) {
    await this.ensureLead(leadId);
    const date = new Date(dueAt);
    const text = note?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.create({
        data: { leadId, type: 'FOLLOW_UP_SCHEDULED', dueAt: date, text },
      });
      return tx.lead.update({
        where: { id: leadId },
        data: { followUpAt: date, followUpNote: text },
        include: { stage: stageSummary },
      });
    });
  }

  /** Marca o próximo contato como feito: sai do lead e fica no histórico. */
  async completeFollowUp(leadId: string) {
    const lead = await this.ensureLead(leadId);
    if (!lead.followUpAt) {
      throw new BadRequestException('Este lead não tem contato agendado');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOW_UP_DONE',
          dueAt: lead.followUpAt,
          text: lead.followUpNote,
        },
      });
      return tx.lead.update({
        where: { id: leadId },
        data: { followUpAt: null, followUpNote: null },
        include: { stage: stageSummary },
      });
    });
  }

  /** Desmarca o próximo contato sem registrar como feito. */
  async cancelFollowUp(leadId: string) {
    await this.ensureLead(leadId);
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { followUpAt: null, followUpNote: null },
      include: { stage: stageSummary },
    });
  }

  private async ensureLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, followUpAt: true, followUpNote: true },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }
}
