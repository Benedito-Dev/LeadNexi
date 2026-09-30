import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InstagramApiClient,
  type MessagingProfile,
} from './instagram-api.client.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** Origem dos leads que chegam pelo direct (a mesma do formulário de lead) */
export const INSTAGRAM_SOURCE = 'Instagram';
/** Nome do lead quando a Meta não informa nome nem @ */
export const UNKNOWN_CONTACT = 'Contato do Instagram';
/** Mensagens muito longas entram cortadas no histórico */
const MAX_TEXT = 2000;

/** Anexo sem texto: o que aparece no histórico */
const ATTACHMENTS: Record<string, string> = {
  image: 'Enviou uma imagem',
  video: 'Enviou um vídeo',
  audio: 'Enviou um áudio',
  file: 'Enviou um arquivo',
  share: 'Compartilhou uma publicação',
  ig_reel: 'Compartilhou um reel',
  reel: 'Compartilhou um reel',
  story_mention: 'Mencionou você nos stories',
  animated_image: 'Enviou um GIF',
  sticker: 'Enviou uma figurinha',
};

/** Evento de mensagem, no formato dos avisos da Meta (entry[].messaging[]) */
interface MessagingEvent {
  sender?: { id?: unknown };
  recipient?: { id?: unknown };
  timestamp?: unknown;
  message?: {
    mid?: unknown;
    text?: unknown;
    is_echo?: unknown;
    is_deleted?: unknown;
    attachments?: { type?: unknown }[];
  };
}

type Json = Record<string, unknown>;

export interface InboxResult {
  /** Leads novos criados pelo direct */
  created: number;
  /** Mensagens registradas no histórico (de leads novos ou que já existiam) */
  messages: number;
  /** Ignoradas: repetidas, enviadas pela própria conta, de outra conta ou sem ID */
  ignored: number;
}

/**
 * Caixa de entrada do direct: cada mensagem recebida vira um item no histórico do lead. Quem
 * ainda não é lead vira um, na primeira etapa do funil, com nome, @ e origem "Instagram".
 * A Meta pode avisar a mesma mensagem mais de uma vez: o ID dela (`mid`) entra uma vez só.
 */
@Injectable()
export class InstagramInboxService {
  private readonly logger = new Logger(InstagramInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  /** Cadastro do webhook: a Meta manda o token; confere com o que a tela mostra. */
  verifyToken(token: unknown): boolean {
    const expected = this.settings.webhookVerifyToken();
    return (
      typeof token === 'string' &&
      expected !== null &&
      sameText(token, expected)
    );
  }

  /** O aviso veio da Meta? `X-Hub-Signature-256: sha256=<HMAC do corpo com a chave secreta do app>` */
  async verifySignature(
    rawBody: Buffer | undefined,
    header: unknown,
  ): Promise<boolean> {
    const secret = await this.settings.appSecret();
    if (!secret || !rawBody || typeof header !== 'string') return false;
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    return sameText(header, expected);
  }

  /** Processa um aviso da Meta. Erro numa mensagem não impede as outras. */
  async handle(payload: unknown): Promise<InboxResult> {
    const result: InboxResult = { created: 0, messages: 0, ignored: 0 };
    const account = await this.prisma.instagramAccount.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    for (const { accountId, event } of messagingEvents(payload)) {
      // Aviso de outra conta (ou sem conta conectada): não é nosso
      if (!account || accountId !== account.igUserId) {
        result.ignored++;
        continue;
      }
      try {
        const outcome = await this.receive(event, account.accessToken);
        if (outcome === 'ignored') result.ignored++;
        else {
          result.messages++;
          if (outcome === 'new-lead') result.created++;
        }
      } catch (error) {
        this.logger.error(
          `Mensagem do direct não registrada: ${(error as Error).message}`,
        );
      }
    }
    return result;
  }

  private async receive(
    event: MessagingEvent,
    storedToken: string,
  ): Promise<'new-lead' | 'message' | 'ignored'> {
    const message = event.message;
    const mid = typeof message?.mid === 'string' ? message.mid : null;
    const senderId =
      typeof event.sender?.id === 'string' ? event.sender.id : null;
    // Mensagem enviada pela própria conta (eco), apagada, ou sem quem mandou
    if (
      !message ||
      !mid ||
      !senderId ||
      message.is_echo ||
      message.is_deleted
    ) {
      return 'ignored';
    }
    const repeated = await this.prisma.leadActivity.findUnique({
      where: { externalId: mid },
      select: { id: true },
    });
    if (repeated) return 'ignored';

    // Quando a pessoa mandou (a Meta pode avisar com atraso); sem data válida, agora
    const timestamp = Number(event.timestamp);
    const sentAt =
      Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp)
        : new Date();

    let lead: { id: string } | null = await this.prisma.lead.findUnique({
      where: { instagramUserId: senderId },
      select: { id: true },
    });
    let created = false;
    if (!lead) {
      const profile = await this.profileOf(senderId, storedToken);
      const result = await this.createLead(senderId, profile, sentAt);
      // Sem funil (nenhuma etapa): não há onde pôr o lead
      if (!result) return 'ignored';
      lead = result.lead;
      created = result.created;
    }

    try {
      await this.prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'INSTAGRAM_MESSAGE',
          text: describeMessage(message),
          externalId: mid,
          createdAt: sentAt,
        },
      });
    } catch (error) {
      // O mesmo aviso chegando duas vezes ao mesmo tempo: o outro já registrou
      if (isUniqueViolation(error)) return 'ignored';
      throw error;
    }
    return created ? 'new-lead' : 'message';
  }

  /** Nome e @ de quem mandou. Se a Meta não responder, o lead nasce com um nome genérico. */
  private async profileOf(
    senderId: string,
    storedToken: string,
  ): Promise<MessagingProfile> {
    try {
      const token = decryptSecret(storedToken, this.settings.requireKey());
      return await this.api.getMessagingProfile(senderId, token);
    } catch (error) {
      this.logger.warn(
        `Perfil de quem mandou direct não lido: ${(error as Error).message}`,
      );
      return { name: null, username: null };
    }
  }

  /**
   * Lead novo no fim da primeira etapa do primeiro funil, com "Criado" no histórico logo antes
   * da primeira mensagem. Se outra mensagem da mesma pessoa criou o lead ao mesmo tempo, usa ele.
   */
  private async createLead(
    senderId: string,
    profile: MessagingProfile,
    firstMessageAt: Date,
  ): Promise<{ lead: { id: string }; created: boolean } | null> {
    const stage = await this.prisma.stage.findFirst({
      orderBy: [
        { pipeline: { position: 'asc' } },
        { pipeline: { createdAt: 'asc' } },
        { position: 'asc' },
      ],
      select: { id: true, name: true },
    });
    if (!stage) {
      this.logger.warn(
        'Direct recebido, mas não há etapa no funil para o lead',
      );
      return null;
    }

    const name =
      profile.name ??
      (profile.username ? `@${profile.username}` : UNKNOWN_CONTACT);
    try {
      const lead = await this.prisma.lead.create({
        data: {
          name: name.slice(0, 120),
          source: INSTAGRAM_SOURCE,
          instagramUserId: senderId,
          instagramUsername: profile.username,
          stageId: stage.id,
          position: await this.prisma.lead.count({
            where: { stageId: stage.id },
          }),
          activities: {
            create: {
              type: 'CREATED',
              text: INSTAGRAM_SOURCE,
              toStage: stage.name,
              // 1 ms antes da mensagem: no histórico, "criado" vem antes dela
              createdAt: new Date(firstMessageAt.getTime() - 1),
            },
          },
        },
        select: { id: true },
      });
      return { lead, created: true };
    } catch (error) {
      // Duas mensagens da mesma pessoa chegando juntas: a outra criou o lead
      if (!isUniqueViolation(error)) throw error;
      const lead = await this.prisma.lead.findUnique({
        where: { instagramUserId: senderId },
        select: { id: true },
      });
      return lead ? { lead, created: false } : null;
    }
  }
}

/**
 * Mensagens do aviso, com a conta a que se referem. A Meta usa `entry[].messaging[]`; o botão
 * "Testar" do painel manda `entry[].changes[]` com `field: "messages"`. Os dois são aceitos.
 */
function messagingEvents(
  payload: unknown,
): { accountId: string; event: MessagingEvent }[] {
  const body = (payload ?? {}) as Json;
  if (body.object !== 'instagram' || !Array.isArray(body.entry)) return [];
  const events: { accountId: string; event: MessagingEvent }[] = [];
  for (const entry of body.entry as Json[]) {
    const id = entry?.id;
    const accountId =
      typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    if (Array.isArray(entry?.messaging)) {
      for (const event of entry.messaging as MessagingEvent[]) {
        events.push({ accountId, event });
      }
    }
    if (Array.isArray(entry?.changes)) {
      for (const change of entry.changes as Json[]) {
        if (change?.field === 'messages' && change.value) {
          events.push({ accountId, event: change.value as MessagingEvent });
        }
      }
    }
  }
  return events;
}

/** Texto da mensagem, ou uma frase para o anexo (imagem, áudio, story...). */
function describeMessage(message: NonNullable<MessagingEvent['message']>) {
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  if (text) return text.slice(0, MAX_TEXT);
  const type = message.attachments?.[0]?.type;
  if (typeof type === 'string' && ATTACHMENTS[type]) return ATTACHMENTS[type];
  return message.attachments?.length ? 'Enviou um anexo' : 'Mensagem sem texto';
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Comparação em tempo constante (não revela o valor esperado pelo tempo de resposta) */
function sameText(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
