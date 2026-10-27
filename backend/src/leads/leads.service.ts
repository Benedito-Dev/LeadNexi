import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  changedPositions,
  insertAt,
  without,
} from '../common/utils/positions.js';
import { localDay } from '../clients/billing.js';
import { LeadListsService } from '../lead-lists/lead-lists.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StagesService } from '../stages/stages.service.js';
import { StorageService } from '../storage/storage.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { MoveLeadDto } from './dto/move-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import {
  ConversationOutcome,
  RecordConversationDto,
  RecordWhatsAppDto,
  RecordWhatsAppResponseDto,
} from './dto/record-whatsapp.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { avatarKey } from './lead-avatar.js';
import type { ActivityVia } from './activity-via.js';

/** Nome de cada campo no histórico ("Claude editou: telefone, responsável"). */
const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  phone: 'telefone',
  email: 'e-mail',
  instagramUsername: 'Instagram',
  source: 'origem',
  responsibleName: 'responsável',
  estimatedValue: 'valor estimado',
  notes: 'observações',
};

const stageSummary = {
  select: { id: true, name: true, pipelineId: true, stageType: true },
} satisfies Prisma.StageDefaultArgs;

const listSummary = {
  select: { id: true, name: true, archived: true },
} satisfies Prisma.LeadListDefaultArgs;

type Tx = Prisma.TransactionClient;

/** Como a conversa ficou, no histórico e no próximo contato. */
const CONVERSATION_NOTES: Record<ConversationOutcome, string> = {
  waiting: 'Respondeu a conversa. Aguardando o lead',
  later: 'Respondeu a conversa. Retorno combinado',
  meeting: 'Respondeu a conversa. Reunião marcada',
  won: 'Respondeu a conversa. Fechou',
  lost: 'Respondeu a conversa. Sem interesse',
};

/** Soma dias corridos, sem contar domingos, preservando o horário do envio. */
export function addCadenceDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) remaining -= 1;
  }
  return result;
}

function cadenceNote(step: number): string {
  return step === 1 ? 'Follow-up 1 (dia 2)' : 'Follow-up final (dia 5)';
}

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
  async create(dto: CreateLeadDto, via?: ActivityVia) {
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
            via,
          },
        },
      },
      include: { stage: stageSummary, list: listSummary },
    });
  }

  /** Edita os dados; vindo do Claude, registra no histórico quais campos mudaram. */
  async update(id: string, dto: UpdateLeadDto, via?: ActivityVia) {
    await this.findOne(id);
    const { listId, followUpAt, meetingAt, ...leadData } = dto;
    const changed = Object.keys(dto)
      .filter((key) => dto[key as keyof UpdateLeadDto] !== undefined)
      .map((key) => FIELD_LABELS[key] ?? key);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(via && changed.length ? { activities: { create: { type: 'LEAD_UPDATED', text: changed.join(', '), via } } } : {}),
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
  async move(id: string, dto: MoveLeadDto, via?: ActivityVia) {
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
          via,
        },
      });
      // Fechou: nasce a ficha de cliente (uma por lead; voltar e fechar de novo mantém a mesma)
      if (targetStage.stageType === 'WON') {
        const wonAt = lead.wonAt ?? now;
        await tx.client.upsert({
          where: { leadId: id },
          create: {
            leadId: id,
            startDate: wonAt,
            billingDay: Math.min(Number(localDay(wonAt).slice(8)), 28),
            monthlyFee: lead.estimatedValue ?? new Prisma.Decimal(500),
          },
          update: { status: 'ACTIVE' },
        });
      }
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

  /** Registra uma mensagem confirmada pelo usuário no WhatsApp e avança a cadência. */
  async recordWhatsAppSent(id: string, { message, templateId, variation }: RecordWhatsAppDto) {
    const lead = await this.findOne(id);
    const text = message.trim();
    if (!text) throw new BadRequestException('A mensagem não pode ficar vazia.');
    // Fora da prospecção (proposta, reunião, cliente…): registra a mensagem e dá o contato agendado
    // como feito, sem mexer na etapa nem na cadência. O passo 0 fica fora da contagem de 1ºs contatos.
    if (lead.stage.stageType !== 'CONTACT' && lead.stage.stageType !== 'SENT') {
      await this.prisma.$transaction([
        this.prisma.leadActivity.create({
          data: {
            leadId: id,
            type: 'WHATSAPP_MESSAGE_SENT',
            text,
            channel: 'whatsapp',
            cadenceStep: 0,
            templateId: templateId?.trim() || 'fora-da-cadencia',
            variation: variation?.trim() || 'padrao',
          },
        }),
        this.prisma.lead.update({ where: { id }, data: { followUpAt: null, followUpNote: null } }),
      ]);
      return this.findOne(id);
    }

    const nextStep = (lead.cadenceStep ?? 0) + 1;
    if (nextStep > 3) {
      throw new BadRequestException('A cadência deste lead já foi concluída.');
    }

    const sentStage = await this.prisma.stage.findFirst({
      where: { pipelineId: lead.stage.pipelineId, stageType: 'SENT' },
      orderBy: { position: 'asc' },
    });
    const noResponseStage =
      nextStep === 3
        ? await this.prisma.stage.findFirst({
            where: {
              pipelineId: lead.stage.pipelineId,
              name: 'Sem resposta',
            },
          })
        : null;
    const targetStage = nextStep === 3 ? noResponseStage : sentStage;
    if (!targetStage) {
      throw new BadRequestException('As etapas da cadência não estão configuradas neste funil.');
    }

    const now = new Date();
    const followUpAt = nextStep === 1 ? addCadenceDays(now, 2) : nextStep === 2 ? addCadenceDays(now, 3) : null;
    await this.prisma.$transaction(async (tx) => {
      const source = await this.columnOf(tx, lead.stageId);
      const target = lead.stageId === targetStage.id ? source : await this.columnOf(tx, targetStage.id);
      const withoutLead = without(source.map((row) => row.id), id);
      const orderedTarget = insertAt(
        lead.stageId === targetStage.id ? withoutLead : target.map((row) => row.id),
        id,
        0,
      );

      await tx.lead.update({
        where: { id },
        data: {
          stageId: targetStage.id,
          cadenceStep: nextStep,
          followUpAt,
          followUpNote: followUpAt ? cadenceNote(nextStep) : null,
          lostReason: nextStep === 3 ? 'Sem resposta' : null,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId: id,
          type: 'WHATSAPP_MESSAGE_SENT',
          text,
          channel: 'whatsapp',
          cadenceStep: nextStep,
          templateId: templateId?.trim() || `prospeccao-fria-passo-${nextStep}`,
          variation: variation?.trim() || 'padrao',
          fromStage: lead.stage.name,
          toStage: targetStage.name,
        },
      });
      await this.applyPositions(tx, source, lead.stageId === targetStage.id ? orderedTarget : withoutLead);
      if (lead.stageId !== targetStage.id) {
        await this.applyPositions(tx, target, orderedTarget);
      }
    });

    return this.findOne(id);
  }

  /** Registra uma resposta manual do WhatsApp e cancela qualquer próximo follow-up. */
  async recordWhatsAppResponse(id: string, { text: responseText }: RecordWhatsAppResponseDto, via?: ActivityVia) {
    const lead = await this.findOne(id);
    if (lead.stage.stageType === 'WON' || lead.stage.stageType === 'LOST') {
      throw new BadRequestException('Este lead já está em uma etapa encerrada.');
    }
    const respondedStage = await this.prisma.stage.findFirst({
      where: { pipelineId: lead.stage.pipelineId, stageType: 'RESPONDED' },
      orderBy: { position: 'asc' },
    });
    if (!respondedStage) {
      throw new BadRequestException('A etapa Respondeu não está configurada neste funil.');
    }

    const text = responseText?.trim() || null;
    await this.prisma.$transaction(async (tx) => {
      const source = await this.columnOf(tx, lead.stageId);
      const target = lead.stageId === respondedStage.id ? source : await this.columnOf(tx, respondedStage.id);
      const withoutLead = without(source.map((row) => row.id), id);
      const orderedTarget = insertAt(
        lead.stageId === respondedStage.id ? withoutLead : target.map((row) => row.id),
        id,
        0,
      );
      await tx.lead.update({
        where: { id },
        data: {
          stageId: respondedStage.id,
          followUpAt: null,
          followUpNote: null,
          lostReason: null,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId: id,
          type: 'WHATSAPP_MESSAGE_RECEIVED',
          text,
          channel: 'whatsapp',
          cadenceStep: lead.cadenceStep,
          fromStage: lead.stage.name,
          toStage: respondedStage.name,
          via,
        },
      });
      await this.applyPositions(tx, source, lead.stageId === respondedStage.id ? orderedTarget : withoutLead);
      if (lead.stageId !== respondedStage.id) {
        await this.applyPositions(tx, target, orderedTarget);
      }
    });

    return this.findOne(id);
  }

  /**
   * Registra a sua resposta numa conversa (lead em "Respondeu") e o que ficou combinado:
   * aguardando o lead (retoma em 2 dias), retorno numa data, reunião, fechou ou sem interesse.
   * Conta como ação do dia; o passo 0 mantém a resposta fora da contagem de 1ºs contatos.
   */
  async recordConversation(id: string, { outcome, at }: RecordConversationDto) {
    const lead = await this.findOne(id);
    if (lead.stage.stageType !== 'RESPONDED') {
      throw new BadRequestException('Este lead não está em uma conversa aberta.');
    }

    const now = new Date();
    const followUpAt = outcome === 'waiting' ? addCadenceDays(now, 2) : outcome === 'later' ? new Date(at!) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.create({
        data: {
          leadId: id,
          type: 'WHATSAPP_MESSAGE_SENT',
          text: CONVERSATION_NOTES[outcome],
          channel: 'whatsapp',
          cadenceStep: 0,
          templateId: 'conversa',
        },
      });
      await tx.lead.update({
        where: { id },
        data: {
          followUpAt,
          followUpNote: followUpAt ? CONVERSATION_NOTES[outcome] : null,
          ...(outcome === 'meeting' ? { meetingAt: new Date(at!) } : {}),
        },
      });
    });

    const stageType = outcome === 'meeting' ? 'MEETING' : outcome === 'won' ? 'WON' : outcome === 'lost' ? 'LOST' : null;
    if (!stageType) return this.findOne(id);
    const target = await this.prisma.stage.findFirst({
      where: { pipelineId: lead.stage.pipelineId, stageType },
      orderBy: { position: 'asc' },
    });
    if (!target) {
      throw new BadRequestException('A etapa de destino não está configurada neste funil.');
    }
    return this.move(id, { stageId: target.id, position: 0, lostReason: outcome === 'lost' ? 'Sem interesse' : undefined });
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
