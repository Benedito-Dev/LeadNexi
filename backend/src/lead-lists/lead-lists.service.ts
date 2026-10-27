import { Injectable, NotFoundException } from '@nestjs/common';
import { SENT_TYPES } from '../leads/scoreboard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResultsService } from '../results/results.service.js';
import { CreateLeadListDto } from './dto/create-lead-list.dto.js';
import { UpdateLeadListDto } from './dto/update-lead-list.dto.js';

export const DEFAULT_LIST_NAME = 'Sem lista';

/** Mensagem do lead (WhatsApp registrado à mão ou direct do Instagram). */
const RESPONSE_TYPES = ['WHATSAPP_MESSAGE_RECEIVED', 'INSTAGRAM_MESSAGE'] as const;

/** Etapas que só existem depois de o lead responder (vale para quem foi importado já nelas). */
const REPLIED_STAGES = ['RESPONDED', 'MEETING', 'PROPOSAL', 'WON'];

type ListStats = { contacted: number; replied: number; won: number };

@Injectable()
export class LeadListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly results: ResultsService,
  ) {}

  /**
   * As listas com o placar de cada uma: contatados, responderam (dos contatados) e fechados.
   * Conta o histórico e também a etapa: lead importado já em "Mensagem enviada" foi contatado. `alert` = a regra de troca de Configurações › Prospecção: depois de
   * N contatos, menos de M respostas, hora de trocar o nicho ou a mensagem.
   */
  async findAll() {
    const [lists, leads, activities, settings] = await Promise.all([
      this.prisma.leadList.findMany({
        orderBy: [{ archived: 'asc' }, { createdAt: 'asc' }],
        include: {
          _count: { select: { leads: { where: { archived: false } } } },
        },
      }),
      this.prisma.lead.findMany({
        where: { archived: false },
        select: { id: true, listId: true, stage: { select: { stageType: true } } },
      }),
      // Uma linha por lead e tipo: basta saber se ele já recebeu e se já respondeu
      this.prisma.leadActivity.findMany({
        where: { type: { in: [...SENT_TYPES, ...RESPONSE_TYPES] }, lead: { archived: false } },
        distinct: ['leadId', 'type'],
        select: { leadId: true, type: true },
      }),
      this.results.getSettings(),
    ]);

    const stats = listStats(leads, activities);
    return lists.map(({ _count, ...list }) => {
      const { contacted, replied, won } = stats.get(list.id) ?? { contacted: 0, replied: 0, won: 0 };
      return {
        ...list,
        leadCount: _count.leads,
        contacted,
        replied,
        won,
        alert: contacted >= settings.decisionContacts && replied < settings.decisionMinReplies,
      };
    });
  }

  async create(dto: CreateLeadListDto) {
    const list = await this.prisma.leadList.create({ data: { name: dto.name.trim(), ...cleanListData(dto) } });
    return { ...list, leadCount: 0 };
  }

  async update(id: string, dto: UpdateLeadListDto) {
    await this.findOrFail(id);
    const list = await this.prisma.leadList.update({
      where: { id },
      data: cleanListData(dto),
    });
    const leadCount = await this.prisma.lead.count({ where: { listId: id, archived: false } });
    return { ...list, leadCount };
  }

  async findOrFail(id: string) {
    const list = await this.prisma.leadList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Lista não encontrada');
    return list;
  }

  async defaultList() {
    const current = await this.prisma.leadList.findFirst({
      where: { name: DEFAULT_LIST_NAME, archived: false },
      orderBy: { createdAt: 'asc' },
    });
    if (current) return current;
    return this.prisma.leadList.create({ data: { name: DEFAULT_LIST_NAME } });
  }
}

function cleanListData(dto: Partial<CreateLeadListDto> & UpdateLeadListDto) {
  return {
    ...(dto.name !== undefined && { name: dto.name.trim() }),
    ...(dto.niche !== undefined && { niche: dto.niche?.trim() || null }),
    ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
    ...(dto.targetContacts !== undefined && { targetContacts: dto.targetContacts }),
    ...('archived' in dto && dto.archived !== undefined && { archived: dto.archived }),
  };
}

/** Contatados, responderam (entre os contatados) e fechados de cada lista. */
function listStats(
  leads: { id: string; listId: string; stage: { stageType: string } }[],
  activities: { leadId: string; type: string }[],
) {
  const sent = new Set<string>();
  const responded = new Set<string>();
  for (const { leadId, type } of activities) {
    if ((SENT_TYPES as readonly string[]).includes(type)) sent.add(leadId);
    else responded.add(leadId);
  }
  const stats = new Map<string, ListStats>();
  for (const { id, listId, stage } of leads) {
    const current = stats.get(listId) ?? { contacted: 0, replied: 0, won: 0 };
    stats.set(listId, current);
    const contacted = sent.has(id) || stage.stageType !== 'CONTACT';
    if (!contacted) continue;
    current.contacted += 1;
    if (responded.has(id) || REPLIED_STAGES.includes(stage.stageType)) current.replied += 1;
    if (stage.stageType === 'WON') current.won += 1;
  }
  return stats;
}
