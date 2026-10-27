import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto.js';
import { DAY_MS, SENT_TYPES, STREAK_WINDOW_DAYS, scoreboard } from './scoreboard.js';
import { messageTemplates } from '../results/message-templates.js';
import type { ActivityVia } from './activity-via.js';

const stageSummary = {
  select: { id: true, name: true, pipelineId: true, stageType: true },
} satisfies Prisma.StageDefaultArgs;

const listSummary = {
  select: { id: true, name: true, archived: true },
} satisfies Prisma.LeadListDefaultArgs;

/** Limite do histórico devolvido de uma vez (os mais recentes). */
const HISTORY_LIMIT = 200;

/** Limite da agenda de contatos (os mais próximos, atrasados primeiro). */
const FOLLOW_UPS_LIMIT = 500;

/**
 * Histórico do lead (anotações e eventos) e o próximo contato agendado (follow-up).
 * Criação e mudança de etapa são registradas pelo LeadsService, na mesma transação do movimento.
 */
@Injectable()
export class LeadActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Leads com próximo contato agendado, do mais atrasado para o mais distante (tela "Hoje"). */
  listFollowUps() {
    return this.prisma.lead.findMany({
      where: { followUpAt: { not: null }, archived: false, list: { archived: false } },
      include: { stage: stageSummary, list: listSummary },
      orderBy: { followUpAt: 'asc' },
      take: FOLLOW_UPS_LIMIT,
    });
  }

  /** Resumo factual da manhã: eventos registrados, fila e compromissos ativos. */
  async todayDashboard() {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);
    endToday.setMilliseconds(-1);

    const startWeek = new Date(startToday);
    const day = startWeek.getDay();
    startWeek.setDate(startWeek.getDate() - (day === 0 ? 6 : day - 1));
    const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
    const active = { archived: false, list: { archived: false } } satisfies Prisma.LeadWhereInput;
    const include = { stage: stageSummary, list: listSummary } satisfies Prisma.LeadInclude;

    const historyStart = new Date(now.getTime() - STREAK_WINDOW_DAYS * DAY_MS);
    const [settings, followUps, responses, newContacts, meetings, contactsMade, responsesThisWeek, meetingsThisWeek, closedThisMonth, recentActions] =
      await Promise.all([
        this.prisma.prospectingSettings.findUnique({ where: { id: 1 } }),
        this.prisma.lead.findMany({
          where: { ...active, followUpAt: { not: null } },
          include,
          orderBy: { followUpAt: 'asc' },
          take: FOLLOW_UPS_LIMIT,
        }),
        this.prisma.lead.findMany({
          // Sua vez: o lead respondeu e você ainda não, ou o retorno combinado chegou
          where: {
            ...active,
            stage: { stageType: 'RESPONDED' },
            OR: [{ followUpAt: null }, { followUpAt: { lte: endToday } }],
          },
          include,
          orderBy: { updatedAt: 'asc' },
          take: 50,
        }),
        this.prisma.lead.findMany({
          where: { ...active, stage: { stageType: 'CONTACT' } },
          include,
          orderBy: [{ googleReviewCount: 'desc' }, { googleRating: 'desc' }, { createdAt: 'asc' }],
          take: 5,
        }),
        this.prisma.lead.findMany({
          where: { ...active, meetingAt: { gte: startToday } },
          include,
          orderBy: { meetingAt: 'asc' },
          take: 20,
        }),
        this.prisma.leadActivity.count({
          where: {
            createdAt: { gte: startWeek, lte: now },
            type: { in: ['WHATSAPP_MESSAGE_SENT', 'INSTAGRAM_MESSAGE_SENT'] },
          },
        }),
        this.prisma.leadActivity.count({
          where: {
            createdAt: { gte: startWeek, lte: now },
            type: { in: ['WHATSAPP_MESSAGE_RECEIVED', 'INSTAGRAM_MESSAGE'] },
          },
        }),
        this.prisma.lead.count({
          where: { ...active, meetingAt: { gte: startWeek, lte: now } },
        }),
        this.prisma.lead.aggregate({
          where: { ...active, wonAt: { gte: startMonth, lte: now }, stage: { stageType: 'WON' } },
          _count: { _all: true },
          _sum: { estimatedValue: true },
        }),
        this.prisma.leadActivity.findMany({
          where: {
            createdAt: { gte: historyStart, lte: now },
            type: { in: [...SENT_TYPES, 'FOLLOW_UP_DONE'] },
          },
          select: { type: true, cadenceStep: true, createdAt: true },
        }),
      ]);
    const dailyTarget = settings?.dailyTarget ?? 5;
    const placar = scoreboard(recentActions, dailyTarget, now);

    return {
      now,
      dailyTarget,
      ...placar,
      weeklyTarget: settings?.weeklyTarget ?? 30,
      monthlyGoal: Number(settings?.monthlyRevenueGoal ?? 300),
      messageTemplates: messageTemplates(settings),
      followUps,
      responses,
      newContacts,
      meetings,
      contactsMade,
      responsesThisWeek,
      responseRate: contactsMade > 0 ? responsesThisWeek / contactsMade : null,
      meetingsThisWeek,
      closedThisMonth: {
        count: closedThisMonth._count._all,
        value: closedThisMonth._sum.estimatedValue ?? 0,
      },
      todayNewContacts: newContacts.length,
      todayFollowUps: followUps.filter((lead) => lead.followUpAt && lead.followUpAt <= endToday).length,
      responseQueueCount: responses.length,
    };
  }

  /** Histórico do lead, do mais novo para o mais antigo. */
  async list(leadId: string) {
    await this.ensureLead(leadId);
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
  }

  async addNote(leadId: string, { text }: CreateNoteDto, via?: ActivityVia) {
    await this.ensureLead(leadId);
    return this.prisma.leadActivity.create({
      data: { leadId, type: 'NOTE', text: text.trim(), via },
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
  async scheduleFollowUp(leadId: string, { dueAt, note }: ScheduleFollowUpDto, via?: ActivityVia) {
    await this.ensureLead(leadId);
    const date = new Date(dueAt);
    const text = note?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.create({
        data: { leadId, type: 'FOLLOW_UP_SCHEDULED', dueAt: date, text, via },
      });
      return tx.lead.update({
        where: { id: leadId },
        data: { followUpAt: date, followUpNote: text },
        include: { stage: stageSummary, list: listSummary },
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
        include: { stage: stageSummary, list: listSummary },
      });
    });
  }

  /** Desmarca o próximo contato sem registrar como feito. */
  async cancelFollowUp(leadId: string) {
    await this.ensureLead(leadId);
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { followUpAt: null, followUpNote: null },
      include: { stage: stageSummary, list: listSummary },
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
