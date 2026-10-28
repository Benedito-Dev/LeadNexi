import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { LeadListsService } from '../lead-lists/lead-lists.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatPhone, type IncomingMessage, parseUpsert, phoneVariants } from './whatsapp-message.js';

/** Origem dos leads que chegam pelo WhatsApp */
export const WHATSAPP_SOURCE = 'WhatsApp';
/** Canal gravado no histórico */
export const WHATSAPP_CHANNEL = 'whatsapp';

export interface WhatsAppInboxResult {
  created: number;
  received: number;
  sent: number;
  /** Repetidas, de grupo, avisos técnicos ou enviadas para quem não é lead */
  ignored: number;
}

/**
 * Caixa de entrada do WhatsApp: cada mensagem avisada pela Evolution entra no histórico do lead.
 * O lead é achado pela conversa já ligada a ele ou pelo telefone cadastrado (com ou sem 55 e o 9);
 * quem ainda não é lead e escreve vira um, na primeira etapa do funil. Mensagem enviada pelo
 * próprio número (celular, WhatsApp Web ou LeadNexi) para quem não é lead não cria lead.
 * O ID da mensagem no WhatsApp entra uma vez só (a Evolution pode avisar de novo).
 */
@Injectable()
export class WhatsAppInboxService {
  private readonly logger = new Logger(WhatsAppInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadLists: LeadListsService,
  ) {}

  async handle(payload: unknown): Promise<WhatsAppInboxResult> {
    const result: WhatsAppInboxResult = { created: 0, received: 0, sent: 0, ignored: 0 };
    for (const message of parseUpsert(payload)) {
      try {
        const outcome = await this.record(message);
        if (outcome === 'ignored') result.ignored++;
        else if (outcome === 'sent') result.sent++;
        else {
          result.received++;
          if (outcome === 'new-lead') result.created++;
        }
      } catch (error) {
        this.logger.error(`Mensagem do WhatsApp não registrada: ${(error as Error).message}`);
      }
    }
    return result;
  }

  private async record(message: IncomingMessage): Promise<'new-lead' | 'received' | 'sent' | 'ignored'> {
    const repeated = await this.prisma.leadActivity.findUnique({ where: { externalId: message.id }, select: { id: true } });
    if (repeated) return 'ignored';

    let leadId = await this.findLead(message);
    let created = false;
    if (!leadId) {
      if (message.fromMe) return 'ignored';
      const lead = await this.createLead(message);
      if (!lead) return 'ignored';
      leadId = lead.id;
      created = lead.created;
    }

    try {
      await this.prisma.leadActivity.create({
        data: {
          leadId,
          type: message.fromMe ? 'WHATSAPP_MESSAGE_SENT' : 'WHATSAPP_MESSAGE_RECEIVED',
          text: message.text,
          channel: WHATSAPP_CHANNEL,
          externalId: message.id,
          // Conversa pelo WhatsApp não é a 1ª mensagem da cadência: não conta na meta de novos contatos
          cadenceStep: message.fromMe ? 0 : null,
          createdAt: message.sentAt,
        },
      });
    } catch (error) {
      // O mesmo aviso chegando duas vezes ao mesmo tempo, ou o LeadNexi já registrou o envio
      if (isUniqueViolation(error)) return 'ignored';
      throw error;
    }
    // Ordem das conversas: pela mensagem mais recente (avisos podem chegar fora de ordem)
    await this.prisma.lead.updateMany({
      where: { id: leadId, OR: [{ whatsappLastMessageAt: null }, { whatsappLastMessageAt: { lt: message.sentAt } }] },
      data: { whatsappLastMessageAt: message.sentAt },
    });
    return message.fromMe ? 'sent' : created ? 'new-lead' : 'received';
  }

  /** Lead da conversa: já ligado a ela, ou com o mesmo telefone (aí liga a conversa a ele). */
  private async findLead(message: IncomingMessage): Promise<string | null> {
    const linked = await this.prisma.lead.findUnique({ where: { whatsappJid: message.jid }, select: { id: true } });
    if (linked) return linked.id;
    if (!message.phone) return null;

    // Telefone digitado de qualquer jeito ("(85) 98812-4471", "+55 85..."): compara só os dígitos
    const [byPhone] = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM leads
      WHERE whatsapp_jid IS NULL AND phone IS NOT NULL
        AND ltrim(regexp_replace(phone, '\\D', '', 'g'), '0') = ANY(${phoneVariants(message.phone)})
      ORDER BY archived ASC, created_at DESC
      LIMIT 1`;
    if (!byPhone) return null;
    try {
      await this.prisma.lead.update({ where: { id: byPhone.id }, data: { whatsappJid: message.jid } });
    } catch (error) {
      // Outra mensagem ligou a conversa ao mesmo tempo
      if (!isUniqueViolation(error)) throw error;
      const lead = await this.prisma.lead.findUnique({ where: { whatsappJid: message.jid }, select: { id: true } });
      return lead?.id ?? null;
    }
    return byPhone.id;
  }

  /** Lead novo no fim da primeira etapa do primeiro funil, com "Criado" logo antes da mensagem. */
  private async createLead(message: IncomingMessage): Promise<{ id: string; created: boolean } | null> {
    const stage = await this.prisma.stage.findFirst({
      orderBy: [{ pipeline: { position: 'asc' } }, { pipeline: { createdAt: 'asc' } }, { position: 'asc' }],
      select: { id: true, name: true },
    });
    if (!stage) {
      this.logger.warn('Mensagem do WhatsApp recebida, mas não há etapa no funil para o lead');
      return null;
    }
    const phone = message.phone ? formatPhone(message.phone) : null;
    const list = await this.leadLists.defaultList();
    try {
      const lead = await this.prisma.lead.create({
        data: {
          name: (message.pushName ?? phone ?? 'Contato do WhatsApp').slice(0, 120),
          phone,
          source: WHATSAPP_SOURCE,
          whatsappJid: message.jid,
          stageId: stage.id,
          listId: list.id,
          position: await this.prisma.lead.count({ where: { stageId: stage.id, archived: false } }),
          activities: {
            create: {
              type: 'CREATED',
              text: WHATSAPP_SOURCE,
              toStage: stage.name,
              createdAt: new Date(message.sentAt.getTime() - 1),
            },
          },
        },
        select: { id: true },
      });
      return { id: lead.id, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const lead = await this.prisma.lead.findUnique({ where: { whatsappJid: message.jid }, select: { id: true } });
      return lead ? { id: lead.id, created: false } : null;
    }
  }
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
