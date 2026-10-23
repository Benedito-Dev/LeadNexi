import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  billingStatus,
  costPerConversation,
  localDay,
  reportMessage,
  weekStartOf,
} from './billing.js';
import { AddPaymentDto, SaveReportDto, UpdateClientDto } from './dto/client.dto.js';

const clientInclude = {
  lead: {
    select: { id: true, name: true, phone: true, instagramUsername: true, avatarId: true, responsibleName: true },
  },
  reports: { orderBy: { weekStart: 'desc' } },
  payments: { orderBy: { paidAt: 'desc' } },
} satisfies Prisma.ClientInclude;

type ClientWithRelations = Prisma.ClientGetPayload<{ include: typeof clientInclude }>;

const toDay = (date: Date) => date.toISOString().slice(0, 10);
const dateOnly = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * Clientes ativos (spec F9): ficha (criada quando o lead vai para "Fechou"), relatórios semanais
 * com a mensagem pronta para o cliente, pagamentos (Pix) e lembretes de renovação.
 * Listas numa consulta só: relatórios e pagamentos vêm junto (include), sem uma consulta por cliente.
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(now = new Date()) {
    const clients = await this.prisma.client.findMany({
      include: clientInclude,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
    return clients.map((client) => this.toView(client, now));
  }

  async findOne(id: string, now = new Date()) {
    return this.toView(await this.load(id), now);
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.load(id);
    const { monthlyFee, dailyAdBudget, startDate, ...rest } = dto;
    await this.prisma.client.update({
      where: { id },
      data: {
        ...rest,
        ...(monthlyFee !== undefined ? { monthlyFee: new Prisma.Decimal(monthlyFee) } : {}),
        ...(dailyAdBudget !== undefined
          ? { dailyAdBudget: dailyAdBudget === null ? null : new Prisma.Decimal(dailyAdBudget) }
          : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
      },
    });
    return this.findOne(id);
  }

  /** Relatório da semana: um por semana (salvar de novo a mesma semana substitui). */
  async saveReport(id: string, dto: SaveReportDto) {
    await this.load(id);
    const weekStart = dateOnly(weekStartOf(dto.weekStart));
    const data = {
      spend: new Prisma.Decimal(dto.spend),
      conversations: dto.conversations,
      notes: dto.notes?.trim() || null,
    };
    await this.prisma.clientReport.upsert({
      where: { clientId_weekStart: { clientId: id, weekStart } },
      create: { clientId: id, weekStart, ...data },
      update: data,
    });
    return this.findOne(id);
  }

  async removeReport(id: string, reportId: string) {
    const { count } = await this.prisma.clientReport.deleteMany({ where: { id: reportId, clientId: id } });
    if (count === 0) throw new NotFoundException('Relatório não encontrado');
    return this.findOne(id);
  }

  async addPayment(id: string, dto: AddPaymentDto) {
    await this.load(id);
    await this.prisma.clientPayment.create({
      data: {
        clientId: id,
        amount: new Prisma.Decimal(dto.amount),
        period: dto.period,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        note: dto.note?.trim() || null,
      },
    });
    return this.findOne(id);
  }

  async removePayment(id: string, paymentId: string) {
    const { count } = await this.prisma.clientPayment.deleteMany({ where: { id: paymentId, clientId: id } });
    if (count === 0) throw new NotFoundException('Pagamento não encontrado');
    return this.findOne(id);
  }

  /**
   * Lembretes da tela Hoje: renovação vencendo em até 3 dias (ou atrasada) e relatório da semana
   * passada ainda não lançado. Só clientes ativos.
   */
  async reminders(now = new Date()) {
    const clients = (await this.list(now)).filter((client) => client.status === 'ACTIVE');
    const lastWeek = weekStartOf(localDay(new Date(now.getTime() - 7 * 86_400_000)));
    return {
      renewals: clients.filter((client) => client.billing.remind),
      // Cliente que começou nesta semana ainda não tem semana passada para relatar
      pendingReports: clients
        .filter((client) => client.startDate.slice(0, 10) < weekStartOf(localDay(now)))
        .filter((client) => !client.reports.some((report) => report.weekStart === lastWeek))
        .map((client) => ({ ...client, pendingWeek: lastWeek })),
    };
  }

  private async load(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id }, include: clientInclude });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private toView(client: ClientWithRelations, now: Date) {
    const firstName = client.lead.responsibleName?.trim().split(/\s+/)[0] ?? null;
    const reports = client.reports.map((report, index) => {
      const previous = client.reports[index + 1];
      const spend = report.spend.toNumber();
      return {
        id: report.id,
        weekStart: toDay(report.weekStart),
        spend: report.spend.toFixed(2),
        conversations: report.conversations,
        costPerConversation: costPerConversation(spend, report.conversations),
        notes: report.notes,
        message: reportMessage({
          firstName,
          weekStart: toDay(report.weekStart),
          spend,
          conversations: report.conversations,
          previous: previous ? { spend: previous.spend.toNumber(), conversations: previous.conversations } : null,
        }),
      };
    });
    const totalSpend = client.reports.reduce((sum, report) => sum.plus(report.spend), new Prisma.Decimal(0));
    const totalConversations = client.reports.reduce((sum, report) => sum + report.conversations, 0);

    return {
      id: client.id,
      leadId: client.leadId,
      lead: client.lead,
      status: client.status,
      plan: client.plan,
      monthlyFee: client.monthlyFee.toFixed(2),
      startDate: client.startDate.toISOString(),
      billingDay: client.billingDay,
      dailyAdBudget: client.dailyAdBudget?.toFixed(2) ?? null,
      partnerAccess: client.partnerAccess,
      whatsappGreeting: client.whatsappGreeting,
      firstCampaignLive: client.firstCampaignLive,
      notes: client.notes,
      billing: billingStatus({
        startDate: localDay(client.startDate),
        billingDay: client.billingDay,
        paidPeriods: client.payments.map((payment) => payment.period),
        today: localDay(now),
      }),
      totals: {
        spend: totalSpend.toFixed(2),
        conversations: totalConversations,
        costPerConversation: costPerConversation(totalSpend.toNumber(), totalConversations),
      },
      reports,
      payments: client.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toFixed(2),
        period: payment.period,
        paidAt: payment.paidAt.toISOString(),
        note: payment.note,
      })),
      createdAt: client.createdAt.toISOString(),
    };
  }
}
