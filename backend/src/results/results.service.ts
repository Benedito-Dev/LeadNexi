import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProspectingSettingsDto } from './dto/update-prospecting-settings.dto.js';

const DEFAULT_SETTINGS = {
  dailyTarget: 5,
  weeklyTarget: 30,
  monthlyRevenueGoal: 300,
  dailyLimit: 8,
  decisionContacts: 30,
  decisionMinReplies: 2,
};

const SENT_TYPES = ['WHATSAPP_MESSAGE_SENT', 'INSTAGRAM_MESSAGE_SENT'] as const;
const RESPONSE_TYPES = ['WHATSAPP_MESSAGE_RECEIVED', 'INSTAGRAM_MESSAGE'] as const;

type ActivityRow = Prisma.LeadActivityGetPayload<{
  select: {
    leadId: true;
    type: true;
    createdAt: true;
    cadenceStep: true;
    templateId: true;
    variation: true;
    toStage: true;
    lead: { select: { listId: true; list: { select: { name: true } } } };
  };
}>;

type Period = { start: Date; end: Date };

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const row = await this.prisma.prospectingSettings.findUnique({ where: { id: 1 } });
    return normalizeSettings(row);
  }

  async updateSettings(dto: UpdateProspectingSettingsDto) {
    const values = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(values).length === 0) throw new BadRequestException('Informe pelo menos uma meta.');
    const row = await this.prisma.prospectingSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...values },
      update: values,
    });
    return normalizeSettings(row);
  }

  async getDashboard() {
    const settings = await this.getSettings();
    const now = new Date();
    const periods = { week: period('week', now), month: period('month', now) };
    const activities = await this.prisma.leadActivity.findMany({
      where: { createdAt: { lte: periods.month.end } },
      orderBy: { createdAt: 'asc' },
      select: {
        leadId: true,
        type: true,
        createdAt: true,
        cadenceStep: true,
        templateId: true,
        variation: true,
        toStage: true,
        lead: { select: { listId: true, list: { select: { name: true } } } },
      },
    });
    const leads = await this.prisma.lead.findMany({
      select: { id: true, wonAt: true, meetingAt: true, estimatedValue: true },
    });

    const firstSent = firstByLead(activities, (row) => isSent(row) && (row.cadenceStep === 1 || row.cadenceStep === null));
    const responses = activities.filter((row) => isResponse(row));
    const weekly = funnel(periods.week, activities, firstSent, responses, leads);
    const monthly = funnel(periods.month, activities, firstSent, responses, leads);
    const messagePerformance = performance(periods.month, firstSent, responses);
    const firstResponseHours = averageFirstResponseHours(firstSent, responses);

    return {
      settings,
      weekly,
      monthly,
      streakDays: streak(firstSent, settings.dailyTarget, now),
      averageFirstResponseHours: firstResponseHours,
      messagePerformance,
      decisionAlert: decisionAlert(activities, settings),
    };
  }
}

function normalizeSettings(row: {
  dailyTarget: number;
  weeklyTarget: number;
  monthlyRevenueGoal: Prisma.Decimal | number;
  dailyLimit: number;
  decisionContacts: number;
  decisionMinReplies: number;
} | null) {
  return {
    dailyTarget: row?.dailyTarget ?? DEFAULT_SETTINGS.dailyTarget,
    weeklyTarget: row?.weeklyTarget ?? DEFAULT_SETTINGS.weeklyTarget,
    monthlyRevenueGoal: Number(row?.monthlyRevenueGoal ?? DEFAULT_SETTINGS.monthlyRevenueGoal),
    dailyLimit: row?.dailyLimit ?? DEFAULT_SETTINGS.dailyLimit,
    decisionContacts: row?.decisionContacts ?? DEFAULT_SETTINGS.decisionContacts,
    decisionMinReplies: row?.decisionMinReplies ?? DEFAULT_SETTINGS.decisionMinReplies,
  };
}

function period(kind: 'week' | 'month', now: Date): Period {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (kind === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  } else {
    start.setDate(1);
  }
  return { start, end: now };
}

function isSent(row: ActivityRow) {
  return (SENT_TYPES as readonly string[]).includes(row.type);
}

function isResponse(row: ActivityRow) {
  return (RESPONSE_TYPES as readonly string[]).includes(row.type);
}

function firstByLead(rows: ActivityRow[], predicate: (row: ActivityRow) => boolean) {
  const result = new Map<string, ActivityRow>();
  for (const row of rows) {
    if (predicate(row) && !result.has(row.leadId)) result.set(row.leadId, row);
  }
  return result;
}

function funnel(periodValue: Period, activities: ActivityRow[], firstSent: Map<string, ActivityRow>, responses: ActivityRow[], leads: { id: string; wonAt: Date | null; meetingAt: Date | null }[]) {
  const inPeriod = (date: Date) => date >= periodValue.start && date <= periodValue.end;
  const contacted = new Set([...firstSent].filter(([, row]) => inPeriod(row.createdAt)).map(([leadId]) => leadId));
  const responded = new Set(responses.filter((row) => inPeriod(row.createdAt)).map((row) => row.leadId));
  const meetings = new Set(activities.filter((row) => inPeriod(row.createdAt) && normalize(row.toStage).includes('reuniao')).map((row) => row.leadId));
  const proposals = new Set(activities.filter((row) => inPeriod(row.createdAt) && normalize(row.toStage).includes('proposta')).map((row) => row.leadId));
  const won = new Set(leads.filter((lead) => lead.wonAt && inPeriod(lead.wonAt)).map((lead) => lead.id));
  const total = contacted.size;
  const step = (count: number) => ({ count, rate: total > 0 ? count / total : null });
  return { contacted: step(total), responded: step(intersectionCount(contacted, responded)), meeting: step(intersectionCount(contacted, meetings)), proposal: step(intersectionCount(contacted, proposals)), won: step(intersectionCount(contacted, won)) };
}

function performance(periodValue: Period, firstSent: Map<string, ActivityRow>, responses: ActivityRow[]) {
  const responseLeads = new Set(responses.filter((row) => row.createdAt >= periodValue.start && row.createdAt <= periodValue.end).map((row) => row.leadId));
  const groups = new Map<string, { templateId: string; variation: string; contacts: number; responses: Set<string> }>();
  for (const [leadId, row] of firstSent) {
    if (row.createdAt < periodValue.start || row.createdAt > periodValue.end) continue;
    const templateId = row.templateId ?? 'sem-template';
    const variation = row.variation ?? 'sem-variação';
    const key = `${templateId}:${variation}`;
    const group = groups.get(key) ?? { templateId, variation, contacts: 0, responses: new Set<string>() };
    group.contacts += 1;
    if (responseLeads.has(leadId)) group.responses.add(leadId);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ templateId: group.templateId, variation: group.variation, contacts: group.contacts, responses: group.responses.size, responseRate: group.contacts > 0 ? group.responses.size / group.contacts : null })).sort((a, b) => b.contacts - a.contacts);
}

function averageFirstResponseHours(firstSent: Map<string, ActivityRow>, responses: ActivityRow[]) {
  const values: number[] = [];
  for (const [leadId, sent] of firstSent) {
    const response = responses.find((row) => row.leadId === leadId && row.createdAt >= sent.createdAt);
    if (response) values.push((response.createdAt.getTime() - sent.createdAt.getTime()) / 3_600_000);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function decisionAlert(activities: ActivityRow[], settings: ReturnType<typeof normalizeSettings>) {
  const firstSent = firstByLead(activities, (row) => isSent(row) && (row.cadenceStep === 1 || row.cadenceStep === null));
  const responses = new Set(activities.filter((row) => isResponse(row)).map((row) => row.leadId));
  const lists = new Map<string, { name: string; contacts: number; replies: number }>();
  for (const [leadId, row] of firstSent) {
    const current = lists.get(row.lead.listId) ?? { name: row.lead.list.name, contacts: 0, replies: 0 };
    current.contacts += 1;
    if (responses.has(leadId)) current.replies += 1;
    lists.set(row.lead.listId, current);
  }
  const alert = [...lists.values()].find((list) => list.contacts >= settings.decisionContacts && list.contacts % settings.decisionContacts === 0 && list.replies < settings.decisionMinReplies);
  return alert ? { ...alert, threshold: settings.decisionContacts, minimumReplies: settings.decisionMinReplies } : null;
}

function streak(firstSent: Map<string, ActivityRow>, target: number, now: Date) {
  const counts = new Map<string, number>();
  for (const row of firstSent.values()) {
    const key = dayKey(row.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let total = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  while ((counts.get(dayKey(cursor)) ?? 0) >= target) {
    total += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return total;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function normalize(value: string | null) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function intersectionCount(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const item of left) if (right.has(item)) count += 1;
  return count;
}
