import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** A Meta só aceita resposta até 24 h depois da última mensagem da pessoa */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Limite da Meta para o texto: 1.000 bytes em UTF-8 (acento e emoji ocupam mais de 1) */
export const MAX_MESSAGE_BYTES = 1000;

/** Erro da Meta: mensagem fora da janela de 24 h */
const WINDOW_CLOSED_SUBCODE = 2534022;
/** Erro da Meta: a pessoa não pode receber mensagens (bloqueou, desativou a conta...) */
const USER_UNAVAILABLE_CODE = 551;
/** Códigos gerais de erro temporário da Graph API */
const TEMPORARY_CODES = new Set([-2, -1, 1, 2]);

export const MESSAGE_ERRORS = {
  noDirect:
    'Esse lead ainda não mandou direct. O Instagram só deixa responder quem escreveu primeiro.',
  windowClosed:
    'Passaram 24 h desde a última mensagem do lead. O Instagram só libera responder quando ele escrever de novo.',
  tooLong:
    'A mensagem está longa demais para o Instagram. Encurte e tente de novo.',
  empty: 'Escreva a mensagem.',
  reconnect:
    'A conexão com o Instagram expirou. Conecte de novo na tela do Instagram.',
  unavailable:
    'Essa pessoa não pode receber mensagens agora (a conta pode ter sido desativada ou bloqueado a sua).',
  transient: 'O Instagram não respondeu a tempo. Tente de novo em instantes.',
};

/**
 * Direct pelo LeadNexi: manda um texto para o lead no Instagram e registra no histórico dele,
 * como a resposta feita pelo app do Instagram. Só para quem já mandou direct (a Meta não deixa
 * começar conversa) e dentro de 24 h depois da última mensagem do lead.
 *
 * O eco que a Meta manda depois traz o mesmo ID da mensagem: o histórico não duplica.
 */
@Injectable()
export class InstagramMessagesService {
  private readonly logger = new Logger(InstagramMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  async send(leadId: string, rawText: string, now = new Date()) {
    const text = rawText.trim();
    if (!text) throw new BadRequestException(MESSAGE_ERRORS.empty);
    if (Buffer.byteLength(text, 'utf8') > MAX_MESSAGE_BYTES) {
      throw new BadRequestException(MESSAGE_ERRORS.tooLong);
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { instagramUserId: true, instagramLastMessageAt: true },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    if (!lead.instagramUserId) {
      throw new ConflictException(MESSAGE_ERRORS.noDirect);
    }
    if (!isWindowOpen(lead.instagramLastMessageAt, now)) {
      throw new ConflictException(MESSAGE_ERRORS.windowClosed);
    }

    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) throw new ConflictException(MESSAGE_ERRORS.reconnect);

    const key = this.settings.requireKey();
    let token: string;
    try {
      token = decryptSecret(account.accessToken, key);
    } catch {
      // Token guardado que não abre (chave trocada): só conectando de novo
      await this.markTokenInvalid(account.id, now);
      throw new ConflictException(MESSAGE_ERRORS.reconnect);
    }

    let messageId: string;
    try {
      messageId = await this.api.sendTextMessage(
        token,
        lead.instagramUserId,
        text,
      );
    } catch (error) {
      throw await this.toHttpError(error, account.id, now);
    }

    try {
      return await this.prisma.leadActivity.create({
        data: {
          leadId,
          type: 'INSTAGRAM_MESSAGE_SENT',
          text,
          externalId: messageId,
          createdAt: now,
        },
      });
    } catch (error) {
      // O eco da Meta chegou antes e já registrou esta mensagem
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.leadActivity.findUniqueOrThrow({
          where: { externalId: messageId },
        });
      }
      throw error;
    }
  }

  /** Erro do envio em português: 409 quando depende do lead ou da conta, 502 quando é da Meta. */
  private async toHttpError(error: unknown, accountId: string, now: Date) {
    if (!(error instanceof InstagramApiError)) {
      this.logger.error(`Direct não enviado: ${(error as Error).message}`);
      return new BadGatewayException(MESSAGE_ERRORS.transient);
    }
    this.logger.warn(
      `Direct não enviado: ${error.message} (HTTP ${error.status}, código ${[error.code, error.subcode].filter(Boolean).join('/')})`,
    );
    if (error.invalidToken) {
      // A tela do Instagram passa a mostrar "Conexão expirada"
      await this.markTokenInvalid(accountId, now);
      return new ConflictException(MESSAGE_ERRORS.reconnect);
    }
    if (error.subcode === WINDOW_CLOSED_SUBCODE) {
      return new ConflictException(MESSAGE_ERRORS.windowClosed);
    }
    if (error.code === USER_UNAVAILABLE_CODE) {
      return new ConflictException(MESSAGE_ERRORS.unavailable);
    }
    if (
      error.status === 0 ||
      error.status >= 500 ||
      (error.code !== undefined && TEMPORARY_CODES.has(error.code))
    ) {
      return new BadGatewayException(MESSAGE_ERRORS.transient);
    }
    const code = error.subcode ?? error.code;
    return new BadGatewayException(
      `O Instagram recusou a mensagem${code ? ` (código ${code})` : ''}.`,
    );
  }

  private async markTokenInvalid(accountId: string, now: Date) {
    await this.prisma.instagramAccount.update({
      where: { id: accountId },
      data: { tokenInvalidAt: now },
    });
  }
}

/** Dá para responder? Até 24 h depois da última mensagem do lead. */
export function isWindowOpen(lastMessageAt: Date | null, now = new Date()) {
  return (
    lastMessageAt !== null &&
    now.getTime() - lastMessageAt.getTime() < REPLY_WINDOW_MS
  );
}
