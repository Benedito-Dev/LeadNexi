import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { decryptSecret } from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInstagramPostDto } from './dto/create-instagram-post.dto.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import { PublishAlarmService } from './publish-alarm.service.js';

/** Tentativas automáticas em falha passageira da Meta; depois disso, "Falhou" */
export const MAX_ATTEMPTS = 3;
/** Nova tentativa automática (ou post que ficou para a próxima rodada): daqui a 1 minuto */
export const RETRY_DELAY_MS = 60_000;
/** "Publicando" parado há mais que isso foi interrompido (a função foi encerrada no meio) */
export const STUCK_MS = 10 * 60 * 1000;
/** Posts por rodada do despertador (cada um leva alguns segundos) */
const BATCH_SIZE = 5;
/** Conferências do contêiner antes de publicar (a Meta baixa e processa as imagens) */
const STATUS_CHECKS = 10;
const STATUS_INTERVAL_MS = 2000;

/** Falhas passageiras, segundo a documentação de erros de publicação da Meta */
const RETRYABLE_SUBCODES = new Set([
  2207001, 2207003, 2207006, 2207008, 2207020, 2207027, 2207032, 2207053,
]);
/** Códigos gerais de erro temporário da Graph API */
const RETRYABLE_CODES = new Set([-2, -1, 1, 2]);

/** Recusas conhecidas, em português claro (subcódigo da Meta → motivo na tela) */
const REFUSALS: Record<number, string> = {
  2207042:
    'O Instagram limita 100 posts por dia feitos por aplicativos. Tente de novo mais tarde.',
  2207009:
    'O Instagram recusou a proporção de uma imagem (precisa ficar entre 4:5 e 1,91:1).',
  2207004: 'Uma imagem passou do tamanho que o Instagram aceita (8 MB).',
  2207005: 'O Instagram não aceitou o formato de uma imagem.',
  2207010: 'A legenda passou de 2.200 caracteres.',
  2207028: 'O carrossel precisa ter de 2 a 10 imagens.',
  2207050:
    'A conta do Instagram está com restrições. Veja os avisos no app do Instagram.',
  2207051:
    'O Instagram bloqueou a publicação como suspeita de spam. Tente de novo mais tarde.',
  2207052: 'O Instagram não conseguiu baixar as imagens do LeadNexi.',
};

export const MESSAGES = {
  transient: 'O Instagram não respondeu a tempo. Tente de novo em instantes.',
  reconnect:
    'A conexão com o Instagram expirou. Conecte de novo e tente outra vez.',
  processing: 'O Instagram não conseguiu processar as imagens. Tente de novo.',
  interrupted:
    'A publicação foi interrompida no meio. Confira no Instagram se o post saiu antes de tentar de novo.',
  internal: 'Não foi possível publicar agora. Tente de novo.',
};

type Outcome = 'published' | 'retrying' | 'failed';

/** Motivo de não publicar, já em português, e se uma nova tentativa pode resolver */
class PublishFailure extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    /** A Meta recusou o token (ou ele não abre): a conta precisa ser conectada de novo */
    readonly tokenRejected = false,
  ) {
    super(message);
  }
}

/**
 * Publicação no Instagram (API com login do Instagram): cada imagem vira um contêiner na Meta
 * (ela baixa a imagem do link assinado do LeadNexi), o carrossel junta os contêineres na ordem,
 * e o contêiner final é publicado. Na hora marcada quem chama é o despertador (PublishAlarm).
 *
 * Um post só é publicado por quem o "pega" (SCHEDULED/FAILED → PUBLISHING numa condição do
 * próprio UPDATE): duas rodadas juntas, ou um clique em "Publicar agora" durante a rodada, não
 * publicam duas vezes.
 */
@Injectable()
export class InstagramPublisherService {
  private readonly logger = new Logger(InstagramPublisherService.name);

  /** Pausa entre as conferências do contêiner (os testes trocam por uma sem espera) */
  sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: InstagramPostsService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
    private readonly alarm: PublishAlarmService,
  ) {}

  /**
   * Novo post: agenda e arma o despertador, ou publica na hora (a resposta já traz o resultado).
   * `alarmFailed`: o despertador está configurado mas não respondeu (o post pode não sair sozinho).
   */
  async create(dto: CreateInstagramPostDto, origin: string) {
    const post = await this.posts.create(dto);
    if (dto.publishNow) {
      await this.publish(post.id, origin, 'manual');
      return this.posts.findOne(post.id);
    }
    const armed = await this.alarm.wakeAt(post.scheduledAt, origin);
    return { ...post, alarmFailed: this.alarm.configured && !armed };
  }

  /** "Publicar agora" num post agendado, ou "Tentar de novo" num que falhou. */
  async publishNow(id: string, origin: string) {
    const claimed = await this.claim(id, ['SCHEDULED', 'FAILED']);
    if (!claimed) {
      const exists = await this.prisma.instagramPost.count({ where: { id } });
      if (!exists) throw new NotFoundException('Post não encontrado');
      throw new ConflictException('Esse post já foi enviado ao Instagram.');
    }
    await this.publish(id, origin, 'manual');
    return this.posts.findOne(id);
  }

  /** Despertador: publica o que já venceu e arma o próximo despertador. */
  async publishDue(origin: string, now = new Date()) {
    const result = {
      published: 0,
      retrying: 0,
      failed: 0,
      interrupted: await this.failInterrupted(now),
    };
    const due = await this.prisma.instagramPost.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH_SIZE,
      select: { id: true },
    });
    for (const { id } of due) {
      // Outra rodada (ou "Publicar agora") pegou antes: segue para o próximo
      if (!(await this.claim(id, ['SCHEDULED']))) continue;
      result[await this.publish(id, origin, 'automatic')]++;
    }
    await this.armNext(origin);
    return result;
  }

  /** Cron diário: fecha publicações interrompidas e remarca o despertador (se algum se perdeu). */
  async maintain(origin: string, now = new Date()) {
    const interrupted = await this.failInterrupted(now);
    const armed = await this.armNext(origin);
    return { interrupted, armed };
  }

  /** O despertador está configurado? (sem ele, nada sai sozinho na hora marcada) */
  status() {
    return { automatic: this.alarm.configured };
  }

  /** Pega o post para publicar, se ele ainda estiver num dos estados esperados. */
  private async claim(id: string, from: ('SCHEDULED' | 'FAILED')[]) {
    const { count } = await this.prisma.instagramPost.updateMany({
      where: { id, status: { in: from } },
      data: { status: 'PUBLISHING', publishingStartedAt: new Date() },
    });
    return count === 1;
  }

  private async failInterrupted(now: Date) {
    const { count } = await this.prisma.instagramPost.updateMany({
      where: {
        status: 'PUBLISHING',
        publishingStartedAt: { lt: new Date(now.getTime() - STUCK_MS) },
      },
      data: { status: 'FAILED', error: MESSAGES.interrupted },
    });
    return count;
  }

  /** Despertador para o próximo agendado; um que já venceu (nova tentativa) espera 1 minuto. */
  private async armNext(origin: string) {
    const next = await this.prisma.instagramPost.findFirst({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    });
    if (!next) return false;
    const soonest = Date.now() + RETRY_DELAY_MS;
    const at =
      next.scheduledAt.getTime() > Date.now()
        ? next.scheduledAt
        : new Date(soonest);
    return this.alarm.wakeAt(at, origin);
  }

  /** Publica um post já pego (PUBLISHING) e grava o resultado. Nunca lança. */
  private async publish(
    id: string,
    origin: string,
    mode: 'manual' | 'automatic',
  ): Promise<Outcome> {
    const post = await this.prisma.instagramPost.findUniqueOrThrow({
      where: { id },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    try {
      if (!account) throw new PublishFailure(MESSAGES.reconnect);
      const token = this.readToken(account.accessToken);
      const mediaId = await this.send(account.igUserId, token, post, origin);
      // Sem o link o post já saiu: não é motivo para falhar
      const permalink = await this.api
        .getPermalink(mediaId, token)
        .catch(() => null);
      await this.prisma.instagramPost.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          igMediaId: mediaId,
          permalink,
          error: null,
          publishingStartedAt: null,
        },
      });
      this.logger.log(`Post ${id} publicado no Instagram (${mediaId})`);
      return 'published';
    } catch (error) {
      const failure = toFailure(error);
      if (account && failure.tokenRejected) {
        // A tela passa a mostrar "Conexão expirada" e pedir para conectar de novo
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: { tokenInvalidAt: new Date() },
        });
      }
      const attempts = post.attempts + 1;
      const retry =
        mode === 'automatic' && failure.retryable && attempts < MAX_ATTEMPTS;
      await this.prisma.instagramPost.update({
        where: { id },
        data: {
          status: retry ? 'SCHEDULED' : 'FAILED',
          attempts,
          error: failure.message,
          publishingStartedAt: null,
        },
      });
      this.logger.warn(
        `Post ${id} não publicado (tentativa ${attempts}${retry ? ', tenta de novo' : ''}): ${describe(error)}`,
      );
      return retry ? 'retrying' : 'failed';
    }
  }

  /** Contêineres na Meta e publicação. Devolve o ID do post no Instagram. */
  private async send(
    igUserId: string,
    token: string,
    post: { caption: string; images: { id: string }[] },
    origin: string,
  ) {
    const imageUrls = await Promise.all(
      post.images.map((image) => this.posts.publicMediaUrl(image.id, origin)),
    );
    const caption = post.caption || undefined;

    let containerId: string;
    if (imageUrls.length === 1) {
      containerId = await this.api.createImageContainer(igUserId, token, {
        imageUrl: imageUrls[0],
        caption,
      });
    } else {
      // Os itens podem ser criados juntos: a ordem do carrossel é a da lista `children`
      const children = await Promise.all(
        imageUrls.map((imageUrl) =>
          this.api.createImageContainer(igUserId, token, {
            imageUrl,
            carouselItem: true,
          }),
        ),
      );
      containerId = await this.api.createCarouselContainer(igUserId, token, {
        children,
        caption,
      });
    }

    await this.waitUntilReady(containerId, token);
    return this.api.publishContainer(igUserId, token, containerId);
  }

  private async waitUntilReady(containerId: string, token: string) {
    for (let check = 1; check <= STATUS_CHECKS; check++) {
      const status = await this.api.getContainerStatus(containerId, token);
      if (status === 'FINISHED') return;
      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new PublishFailure(MESSAGES.processing, true);
      }
      if (check < STATUS_CHECKS) await this.sleep(STATUS_INTERVAL_MS);
    }
    throw new PublishFailure(MESSAGES.transient, true);
  }

  private readToken(stored: string) {
    const key = this.settings.requireKey();
    try {
      return decryptSecret(stored, key);
    } catch {
      // Chave de criptografia trocada: só conectando de novo
      throw new PublishFailure(MESSAGES.reconnect, false, true);
    }
  }
}

/** Qualquer erro vira um motivo em português, passageiro ou não. */
function toFailure(error: unknown): PublishFailure {
  if (error instanceof PublishFailure) return error;
  if (!(error instanceof InstagramApiError)) {
    return new PublishFailure(MESSAGES.internal, true);
  }
  if (error.invalidToken) {
    return new PublishFailure(MESSAGES.reconnect, false, true);
  }
  const refusal = error.subcode ? REFUSALS[error.subcode] : undefined;
  if (refusal) return new PublishFailure(refusal);
  if (
    error.status === 0 ||
    error.status >= 500 ||
    (error.subcode !== undefined && RETRYABLE_SUBCODES.has(error.subcode)) ||
    (error.subcode === undefined &&
      error.code !== undefined &&
      RETRYABLE_CODES.has(error.code))
  ) {
    return new PublishFailure(MESSAGES.transient, true);
  }
  const code = error.subcode ?? error.code;
  return new PublishFailure(
    `O Instagram recusou a publicação${code ? ` (código ${code})` : ''}.`,
  );
}

/** Mensagem de erro para o log, sem dados da requisição (tokens ficam fora) */
function describe(error: unknown) {
  if (error instanceof InstagramApiError) {
    const code = [error.code, error.subcode].filter(Boolean).join('/');
    return `${error.message} (HTTP ${error.status}${code ? `, código ${code}` : ''})`;
  }
  return error instanceof Error ? error.message : String(error);
}
