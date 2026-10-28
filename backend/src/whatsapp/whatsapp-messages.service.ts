import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EvolutionClient, EvolutionError } from './evolution.client.js';
import { WHATSAPP_CHANNEL } from './whatsapp-inbox.service.js';
import { formatPhone } from './whatsapp-message.js';

/** Conversas mostradas no inbox (as mais recentes) */
export const WHATSAPP_INBOX_LIMIT = 100;
/** Mensagens mostradas na conversa (as mais recentes) */
export const WHATSAPP_CONVERSATION_LIMIT = 200;
/** Limite do texto enviado pelo LeadNexi */
export const MAX_WHATSAPP_TEXT = 4096;

const MESSAGE_TYPES = ['WHATSAPP_MESSAGE_RECEIVED', 'WHATSAPP_MESSAGE_SENT'] as const;
/**
 * Só as mensagens que passaram pelo WhatsApp de verdade (com o ID do WhatsApp). Os registros
 * manuais de antes ("enviei pelo WhatsApp", "respondeu") ficam no histórico, mas não na conversa.
 */
const REAL_MESSAGES = { type: { in: [...MESSAGE_TYPES] }, externalId: { not: null } } satisfies Prisma.LeadActivityWhereInput;

/** Por que não dá para responder pelo LeadNexi agora */
export type WhatsAppBlock = 'no-whatsapp' | 'disconnected';

export const WHATSAPP_ERRORS = {
  empty: 'Escreva a mensagem.',
  tooLong: 'A mensagem está longa demais. Encurte e tente de novo.',
  noWhatsApp: 'Esse lead ainda não tem conversa no WhatsApp conectado.',
  disconnected: 'O WhatsApp não está conectado. Leia o QR code em Configurações › Canais.',
  unreachable: 'A ponte do WhatsApp não respondeu. Confira se ela está ligada e tente de novo.',
};

const directionOf = (type: string) => (type === 'WHATSAPP_MESSAGE_SENT' ? ('sent' as const) : ('received' as const));

/**
 * Conversas do WhatsApp no LeadNexi: a lista, as mensagens de um lead e a resposta. Sem a janela
 * de 24 h do Instagram: dá para responder enquanto o número estiver conectado. Todo envio sai de
 * um clique, um por vez (regra do MAPA para o WhatsApp não oficial).
 */
@Injectable()
export class WhatsAppMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionClient,
  ) {}

  /** Quem conversou pelo WhatsApp, da mensagem mais recente para a mais antiga (uma consulta só). */
  async inbox() {
    const leads = await this.prisma.lead.findMany({
      where: { whatsappJid: { not: null } },
      orderBy: [{ whatsappLastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: WHATSAPP_INBOX_LIMIT,
      select: {
        id: true,
        name: true,
        phone: true,
        whatsappJid: true,
        avatarId: true,
        archived: true,
        stage: { select: { name: true } },
        activities: {
          where: REAL_MESSAGES,
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, text: true, createdAt: true },
        },
      },
    });
    return leads.map(({ activities: [last], stage, whatsappJid, phone, ...lead }) => ({
      ...lead,
      phone: phone ?? phoneOfJid(whatsappJid),
      stageName: stage.name,
      // Sem janela de resposta no WhatsApp; a conexão é conferida ao abrir a conversa
      canReply: true,
      lastMessage: last ? { text: last.text ?? '', direction: directionOf(last.type), createdAt: last.createdAt } : null,
    }));
  }

  /** As últimas 200 mensagens (mais antiga primeiro) e se dá para responder agora. */
  async conversation(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { whatsappJid: true } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    const recent = await this.prisma.leadActivity.findMany({
      where: { leadId, ...REAL_MESSAGES },
      orderBy: { createdAt: 'desc' },
      take: WHATSAPP_CONVERSATION_LIMIT,
      select: { id: true, type: true, text: true, createdAt: true },
    });
    const blocked: WhatsAppBlock | null = !lead.whatsappJid ? 'no-whatsapp' : (await this.connected()) ? null : 'disconnected';
    return {
      canReply: blocked === null,
      blocked,
      replyUntil: null,
      messages: recent.reverse().map((m) => ({ id: m.id, direction: directionOf(m.type), text: m.text ?? '', createdAt: m.createdAt })),
    };
  }

  async send(leadId: string, rawText: string, now = new Date()) {
    const text = rawText.trim();
    if (!text) throw new BadRequestException(WHATSAPP_ERRORS.empty);
    if (text.length > MAX_WHATSAPP_TEXT) throw new BadRequestException(WHATSAPP_ERRORS.tooLong);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { whatsappJid: true } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    if (!lead.whatsappJid) throw new ConflictException(WHATSAPP_ERRORS.noWhatsApp);
    if (!this.evolution.configured) throw new ServiceUnavailableException(WHATSAPP_ERRORS.disconnected);

    let messageId: string;
    try {
      ({ id: messageId } = await this.evolution.sendText(lead.whatsappJid, text));
    } catch (error) {
      if (error instanceof EvolutionError) {
        if (error.status === 0) throw new ServiceUnavailableException(WHATSAPP_ERRORS.unreachable);
        if (!(await this.connected())) throw new ConflictException(WHATSAPP_ERRORS.disconnected);
        throw new BadGatewayException(error.message);
      }
      throw error;
    }

    await this.prisma.lead.update({ where: { id: leadId }, data: { whatsappLastMessageAt: now } });
    try {
      return await this.prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_MESSAGE_SENT',
          text,
          channel: WHATSAPP_CHANNEL,
          externalId: messageId,
          cadenceStep: 0,
          createdAt: now,
        },
      });
    } catch (error) {
      // O aviso da Evolution chegou antes e já registrou esta mensagem
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.leadActivity.findUniqueOrThrow({ where: { externalId: messageId } });
      }
      throw error;
    }
  }

  private async connected() {
    if (!this.evolution.configured) return false;
    try {
      return (await this.evolution.findInstance())?.state === 'open';
    } catch {
      return false;
    }
  }
}

/** Telefone formatado a partir do JID (quando é o número, não o identificador anônimo) */
function phoneOfJid(jid: string | null) {
  return jid?.endsWith('@s.whatsapp.net') ? formatPhone(jid.split('@')[0].split(':')[0]) : null;
}
