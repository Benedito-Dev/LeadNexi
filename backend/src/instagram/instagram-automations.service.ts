import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import type {
  InstagramAccount,
  InstagramAutomation,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pickAutomation } from './automation-match.js';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
} from './dto/automation.dto.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';
import {
  InstagramLeadsService,
  isUniqueViolation,
} from './instagram-leads.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** Marca no histórico do lead: a mensagem saiu sozinha, por uma automação */
export const VIA_AUTOMATION = 'automacao';
/** Comentário guardado no registro, cortado se for muito longo */
const MAX_COMMENT = 500;
/** Últimos disparos mostrados na tela de uma automação */
const RECENT_RUNS = 30;
/** Payload do botão: liga o toque ao disparo (comentário) que mandou a mensagem */
const POSTBACK_PREFIX = 'automacao:';
/** Limite do texto acima do botão (modelo de botão da Meta) */
export const BUTTON_TEXT_LIMIT = 640;
/** Quem não segue e tocou no botão, quando a automação não tem um texto próprio */
export const DEFAULT_NOT_FOLLOWING =
  'Quase lá! Siga o perfil e toque no botão de novo para receber.';

/** Comentário no formato dos avisos da Meta (entry[].changes[] com field "comments") */
interface CommentEvent {
  id?: unknown;
  text?: unknown;
  from?: { id?: unknown; username?: unknown };
  media?: { id?: unknown };
}

/** Toque num botão do direct (entry[].messaging[] com postback) */
interface Postback {
  accountId: string;
  senderId: string;
  payload: string;
}

interface Comment {
  id: string;
  text: string;
  mediaId: string;
  fromId: string;
  username: string | null;
}

type Json = Record<string, unknown>;

export interface AutomationsResult {
  /** Mensagens enviadas no direct (a do comentário e a entrega depois do botão) */
  sent: number;
  /** Comentários que dispararam, mas a Meta recusou */
  failed: number;
  /** Ignorados: da própria conta, repetidos, sem automação que sirva ou já respondidos antes */
  ignored: number;
}

/**
 * Automações do Instagram: alguém comenta num post e recebe a mensagem no direct, sozinho (a
 * "resposta privada" da Meta). Quem comenta vira lead, e a mensagem entra no histórico marcada
 * "via automação". Cada comentário dispara no máximo uma vez, e a mesma pessoa recebe a mesma
 * automação uma vez só por post, por mais que comente.
 */
@Injectable()
export class InstagramAutomationsService {
  private readonly logger = new Logger(InstagramAutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
    private readonly leads: InstagramLeadsService,
  ) {}

  /** Todas, a mais nova primeiro, com quantas mensagens cada uma já mandou. */
  async list() {
    const [automations, counts, last, delivered] = await Promise.all([
      this.prisma.instagramAutomation.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.instagramAutomationRun.groupBy({
        by: ['automationId', 'status'],
        _count: { _all: true },
      }),
      this.prisma.instagramAutomationRun.groupBy({
        by: ['automationId'],
        where: { status: 'SENT' },
        _max: { createdAt: true },
      }),
      this.prisma.instagramAutomationRun.groupBy({
        by: ['automationId'],
        where: { deliveredAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const count = (id: string, status: string) =>
      counts.find((c) => c.automationId === id && c.status === status)?._count
        ._all ?? 0;
    return automations.map((automation) => ({
      ...automation,
      sent: count(automation.id, 'SENT'),
      failed: count(automation.id, 'FAILED'),
      /** Com botão: quantos tocaram e receberam a entrega */
      delivered:
        delivered.find((d) => d.automationId === automation.id)?._count._all ??
        0,
      lastSentAt:
        last.find((l) => l.automationId === automation.id)?._max.createdAt ??
        null,
    }));
  }

  create(dto: CreateAutomationDto) {
    checkSetup({
      message: dto.message,
      buttonLabel: dto.buttonLabel ?? null,
      deliveryMessage: dto.deliveryMessage ?? null,
      requireFollow: dto.requireFollow ?? false,
    });
    return this.prisma.instagramAutomation.create({ data: dto });
  }

  async update(id: string, dto: UpdateAutomationDto) {
    const current = await this.prisma.instagramAutomation.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Automação não encontrada');
    // O que fica depois da edição (campo ausente = o atual; null = tirado)
    checkSetup({
      message: dto.message ?? current.message,
      buttonLabel:
        dto.buttonLabel === undefined ? current.buttonLabel : dto.buttonLabel,
      deliveryMessage:
        dto.deliveryMessage === undefined
          ? current.deliveryMessage
          : dto.deliveryMessage,
      requireFollow: dto.requireFollow ?? current.requireFollow,
    });
    return this.prisma.instagramAutomation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    await this.prisma.instagramAutomation.delete({ where: { id } });
  }

  /** Os últimos disparos (quem comentou, o quê, e se a mensagem saiu). */
  async runs(id: string) {
    await this.findOrThrow(id);
    return this.prisma.instagramAutomationRun.findMany({
      where: { automationId: id },
      orderBy: { createdAt: 'desc' },
      take: RECENT_RUNS,
      select: {
        id: true,
        mediaId: true,
        username: true,
        commentText: true,
        leadId: true,
        status: true,
        error: true,
        deliveredAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Processa os comentários e os toques nos botões de um aviso da Meta. Erro num não impede os
   * outros.
   */
  async handle(payload: unknown, now = new Date()): Promise<AutomationsResult> {
    const result: AutomationsResult = { sent: 0, failed: 0, ignored: 0 };
    const events = commentEvents(payload);
    const taps = postbackEvents(payload);
    if (events.length === 0 && taps.length === 0) return result;

    const account = await this.prisma.instagramAccount.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const automations = await this.prisma.instagramAutomation.findMany({
      where: { active: true },
    });

    for (const { accountId, comment } of events) {
      // Aviso de outra conta (ou sem conta conectada), ou comentário da própria conta (inclusive
      // a resposta pública da automação): não dispara
      if (
        !account ||
        accountId !== account.igUserId ||
        comment.fromId === account.igUserId
      ) {
        result.ignored++;
        continue;
      }
      try {
        const outcome = await this.respond(account, automations, comment, now);
        result[outcome]++;
      } catch (error) {
        result.failed++;
        this.logger.error(
          `Automação do comentário ${comment.id} falhou: ${(error as Error).message}`,
        );
      }
    }

    for (const tap of taps) {
      if (!account || tap.accountId !== account.igUserId) {
        result.ignored++;
        continue;
      }
      try {
        result[await this.deliver(account, tap, now)]++;
      } catch (error) {
        result.failed++;
        this.logger.error(
          `Entrega da automação falhou: ${(error as Error).message}`,
        );
      }
    }
    return result;
  }

  /**
   * A pessoa tocou no botão: entrega o conteúdo (uma vez só). Se a automação pede que siga e ela
   * não segue, manda o pedido com o botão de novo. Se a Meta não informar, entrega (o lead não
   * fica preso por uma falha da conferência).
   */
  private async deliver(
    account: InstagramAccount,
    tap: Postback,
    now: Date,
  ): Promise<keyof AutomationsResult> {
    const run = await this.prisma.instagramAutomationRun.findUnique({
      where: { id: tap.payload.slice(POSTBACK_PREFIX.length) },
      include: { automation: true },
    });
    const automation = run?.automation;
    if (
      !run ||
      !automation?.buttonLabel ||
      !automation.deliveryMessage ||
      run.commenterId !== tap.senderId ||
      run.deliveredAt
    ) {
      return 'ignored';
    }

    // O toque abre a janela de 24 h do direct, como uma mensagem
    if (run.leadId) {
      await this.prisma.lead.updateMany({
        where: {
          id: run.leadId,
          OR: [
            { instagramLastMessageAt: null },
            { instagramLastMessageAt: { lt: now } },
          ],
        },
        data: { instagramLastMessageAt: now },
      });
    }

    const token = decryptSecret(account.accessToken, this.settings.requireKey());
    if (automation.requireFollow) {
      const follows = await this.api
        .followsAccount(token, tap.senderId)
        .catch((error: unknown) => {
          this.logger.warn(
            `Não deu para conferir se @${run.username ?? tap.senderId} segue: ${(error as Error).message}`,
          );
          return null;
        });
      if (follows === false) {
        const text = automation.notFollowingMessage ?? DEFAULT_NOT_FOLLOWING;
        try {
          const messageId = await this.api.sendButtonMessage(token, tap.senderId, text, {
            title: automation.buttonLabel,
            payload: tap.payload,
          });
          if (run.leadId) await this.recordSent(run.leadId, messageId, text, now);
          return 'sent';
        } catch (error) {
          await this.prisma.instagramAutomationRun.update({
            where: { id: run.id },
            data: { error: await this.describeFailure(error, account.id, now) },
          });
          return 'failed';
        }
      }
    }

    // Reserva a entrega: o mesmo toque avisado duas vezes não entrega duas
    const { count } = await this.prisma.instagramAutomationRun.updateMany({
      where: { id: run.id, deliveredAt: null },
      data: { deliveredAt: now },
    });
    if (count === 0) return 'ignored';
    try {
      const messageId = await this.api.sendTextMessage(
        token,
        tap.senderId,
        automation.deliveryMessage,
      );
      if (run.leadId) {
        await this.recordSent(run.leadId, messageId, automation.deliveryMessage, now);
      }
      await this.prisma.instagramAutomationRun.update({
        where: { id: run.id },
        data: { error: null },
      });
      return 'sent';
    } catch (error) {
      await this.prisma.instagramAutomationRun.update({
        where: { id: run.id },
        data: {
          deliveredAt: null,
          error: await this.describeFailure(error, account.id, now),
        },
      });
      return 'failed';
    }
  }

  private async respond(
    account: InstagramAccount,
    automations: InstagramAutomation[],
    comment: Comment,
    now: Date,
  ): Promise<keyof AutomationsResult> {
    const automation = pickAutomation(
      automations,
      comment.mediaId,
      comment.text,
    );
    if (!automation) return 'ignored';

    const answeredBefore = await this.prisma.instagramAutomationRun.findFirst({
      where: {
        automationId: automation.id,
        commenterId: comment.fromId,
        mediaId: comment.mediaId,
        status: 'SENT',
      },
      select: { id: true },
    });

    // Reserva o comentário: o mesmo aviso chegando de novo (ou ao mesmo tempo) para aqui
    let runId: string;
    try {
      const run = await this.prisma.instagramAutomationRun.create({
        data: {
          automationId: automation.id,
          commentId: comment.id,
          mediaId: comment.mediaId,
          commenterId: comment.fromId,
          username: comment.username,
          commentText: comment.text.slice(0, MAX_COMMENT),
          status: answeredBefore ? 'SKIPPED' : 'PENDING',
          createdAt: now,
        },
        select: { id: true },
      });
      runId = run.id;
    } catch (error) {
      if (isUniqueViolation(error)) return 'ignored';
      throw error;
    }
    if (answeredBefore) return 'ignored';

    const lead = await this.leadOf(comment, now);
    let token: string;
    let messageId: string;
    try {
      token = decryptSecret(account.accessToken, this.settings.requireKey());
      messageId = await this.api.sendPrivateReply(
        token,
        comment.id,
        automation.message,
        automation.buttonLabel
          ? {
              title: automation.buttonLabel,
              payload: `${POSTBACK_PREFIX}${runId}`,
            }
          : undefined,
      );
    } catch (error) {
      await this.prisma.instagramAutomationRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          leadId: lead?.id ?? null,
          error: await this.describeFailure(error, account.id, now),
        },
      });
      return 'failed';
    }

    if (lead) await this.recordSent(lead.id, messageId, automation.message, now);
    const publicError = await this.replyInPublic(
      token,
      comment.id,
      automation.publicReplies,
    );
    await this.prisma.instagramAutomationRun.update({
      where: { id: runId },
      data: { status: 'SENT', leadId: lead?.id ?? null, error: publicError },
    });
    return 'sent';
  }

  /** O lead de quem comentou; quem ainda não é lead vira um, com o @ do comentário. */
  private async leadOf(comment: Comment, now: Date) {
    const lead = await this.prisma.lead.findUnique({
      where: { instagramUserId: comment.fromId },
      select: { id: true },
    });
    if (lead) return lead;
    const created = await this.leads.create(
      comment.fromId,
      { name: null, username: comment.username, profilePictureUrl: null },
      now,
    );
    return created?.lead ?? null;
  }

  /** A mensagem no histórico do lead. Se o eco da Meta chegou antes, completa o dele. */
  private async recordSent(
    leadId: string,
    messageId: string,
    text: string,
    now: Date,
  ) {
    try {
      await this.prisma.leadActivity.create({
        data: {
          leadId,
          type: 'INSTAGRAM_MESSAGE_SENT',
          text,
          externalId: messageId,
          via: VIA_AUTOMATION,
          createdAt: now,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // O eco de mensagem com botão chega sem o texto: fica o que foi enviado
      await this.prisma.leadActivity.update({
        where: { externalId: messageId },
        data: { via: VIA_AUTOMATION, text },
      });
    }
  }

  /** Resposta pública sorteada entre as cadastradas. Falha não desfaz o direct: vira um aviso. */
  private async replyInPublic(
    token: string,
    commentId: string,
    replies: string[],
  ): Promise<string | null> {
    if (replies.length === 0) return null;
    const text = replies[Math.floor(Math.random() * replies.length)];
    try {
      await this.api.replyToComment(token, commentId, text);
      return null;
    } catch (error) {
      this.logger.warn(
        `Resposta pública ao comentário ${commentId} não saiu: ${(error as Error).message}`,
      );
      return 'O direct saiu, mas a resposta pública no comentário não.';
    }
  }

  /** O motivo da falha em português, para a tela. Token recusado marca a conta para reconectar. */
  private async describeFailure(error: unknown, accountId: string, now: Date) {
    if (!(error instanceof InstagramApiError)) {
      this.logger.error(`Automação não enviou: ${(error as Error).message}`);
      return 'Falha inesperada ao enviar a mensagem.';
    }
    this.logger.warn(
      `Automação não enviou: ${error.message} (HTTP ${error.status}, código ${[error.code, error.subcode].filter(Boolean).join('/')})`,
    );
    if (error.invalidToken) {
      await this.prisma.instagramAccount.update({
        where: { id: accountId },
        data: { tokenInvalidAt: now },
      });
      return 'A conexão com o Instagram expirou. Conecte de novo em Configurações › Canais.';
    }
    if (error.missingPermission) {
      return 'Falta a permissão de comentários. Conecte o Instagram de novo em Configurações › Canais.';
    }
    if (error.rateLimited) {
      return 'O Instagram pediu para esperar: muitas mensagens em pouco tempo.';
    }
    if (error.status === 0) return 'O Instagram não respondeu.';
    const code = error.subcode ?? error.code;
    return `O Instagram recusou a mensagem${code ? ` (código ${code})` : ''}.`;
  }

  private async findOrThrow(id: string) {
    const automation = await this.prisma.instagramAutomation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');
    return automation;
  }
}

/** Comentários do aviso (entry[].changes[] com field "comments"), com a conta a que se referem. */
function commentEvents(
  payload: unknown,
): { accountId: string; comment: Comment }[] {
  const body = (payload ?? {}) as Json;
  if (body.object !== 'instagram' || !Array.isArray(body.entry)) return [];
  const events: { accountId: string; comment: Comment }[] = [];
  for (const entry of body.entry as Json[]) {
    const id = entry?.id;
    const accountId =
      typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes as Json[]) {
      if (change?.field !== 'comments' || !change.value) continue;
      const value = change.value as CommentEvent;
      const commentId = asId(value.id);
      const mediaId = asId(value.media?.id);
      const fromId = asId(value.from?.id);
      if (!commentId || !mediaId || !fromId) continue;
      events.push({
        accountId,
        comment: {
          id: commentId,
          text: typeof value.text === 'string' ? value.text : '',
          mediaId,
          fromId,
          username:
            typeof value.from?.username === 'string'
              ? value.from.username
              : null,
        },
      });
    }
  }
  return events;
}

function asId(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null;
}

/** Toques nos botões das automações (entry[].messaging[] com postback "automacao:<disparo>"). */
function postbackEvents(payload: unknown): Postback[] {
  const body = (payload ?? {}) as Json;
  if (body.object !== 'instagram' || !Array.isArray(body.entry)) return [];
  const taps: Postback[] = [];
  for (const entry of body.entry as Json[]) {
    const accountId = asId(entry?.id) ?? '';
    if (!Array.isArray(entry?.messaging)) continue;
    for (const event of entry.messaging as Json[]) {
      const postback = event?.postback as Json | undefined;
      const senderId = asId((event?.sender as Json | undefined)?.id);
      const data = postback?.payload;
      if (!senderId || typeof data !== 'string' || !data.startsWith(POSTBACK_PREFIX)) {
        continue;
      }
      taps.push({ accountId, senderId, payload: data });
    }
  }
  return taps;
}

/**
 * Regras que dependem de mais de um campo: "siga para receber" precisa do botão (só depois do
 * toque a Meta diz se a pessoa segue), o botão precisa da entrega e o texto acima do botão tem
 * o limite do modelo da Meta.
 */
function checkSetup(setup: {
  message?: string;
  buttonLabel?: string | null;
  deliveryMessage?: string | null;
  requireFollow?: boolean;
}) {
  if (setup.requireFollow && !setup.buttonLabel) {
    throw new BadRequestException(
      'Para pedir que a pessoa siga, a mensagem precisa ter um botão.',
    );
  }
  if (setup.buttonLabel && !setup.deliveryMessage) {
    throw new BadRequestException(
      'Escreva o que chega quando a pessoa tocar no botão.',
    );
  }
  if (setup.buttonLabel && (setup.message?.length ?? 0) > BUTTON_TEXT_LIMIT) {
    throw new BadRequestException(
      `Com botão, a mensagem tem até ${BUTTON_TEXT_LIMIT} caracteres.`,
    );
  }
}
