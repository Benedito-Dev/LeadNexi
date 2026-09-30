import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { readJpegSize } from '../common/utils/jpeg.js';
import type { InstagramPostStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  CreateInstagramPostDto,
  HASHTAG_LIMIT,
} from './dto/create-instagram-post.dto.js';

/** Proporções que o Instagram aceita num post do feed: de 4:5 (retrato) a 1,91:1 (paisagem) */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;
const RATIO_TOLERANCE = 0.01;

/** Audiência do JWT dos links de imagem (não serve como token de acesso) */
export const MEDIA_URL_AUDIENCE = 'instagram-media';
/** Validade dos links de imagem mostrados na tela */
const MEDIA_URL_TTL = '1h';

/** Imagem enviada e não usada em post por mais que isso: o cron diário apaga */
export const ORPHAN_MEDIA_MS = 24 * 60 * 60 * 1000;

/** Pode ser cancelado: o que ainda não foi para o Instagram, ou o que já saiu de lá (tira da lista) */
const CANCELABLE: InstagramPostStatus[] = ['SCHEDULED', 'FAILED', 'REMOVED'];
/** Já foram para o Instagram (os removidos de lá seguem na lista, marcados, até alguém tirar) */
const SENT: InstagramPostStatus[] = ['PUBLISHED', 'REMOVED'];

type MediaRef = { id: string; storageKey: string };

/** Arquivo recebido no upload (o que o Multer entrega e o serviço usa) */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/** Publicados mostrados na lista (os mais recentes) */
export const PUBLISHED_IN_LIST = 20;

/**
 * Posts do Instagram montados no LeadNexi: envio das imagens, agendamento, lista e cancelamento.
 * A publicação em si fica no InstagramPublisherService.
 */
@Injectable()
export class InstagramPostsService {
  private readonly logger = new Logger(InstagramPostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  /** Guarda uma imagem (JPEG) no armazenamento. Ela fica solta até entrar num post. */
  async upload(file: UploadedImage | undefined) {
    if (!file) throw new BadRequestException('Envie a imagem no campo "file".');
    const size = readJpegSize(file.buffer);
    if (!size) {
      throw new UnsupportedMediaTypeException(
        'A imagem precisa estar em JPEG.',
      );
    }
    const ratio = size.width / size.height;
    if (
      ratio < MIN_RATIO - RATIO_TOLERANCE ||
      ratio > MAX_RATIO + RATIO_TOLERANCE
    ) {
      throw new BadRequestException(
        'A proporção da imagem precisa ficar entre 4:5 e 1,91:1.',
      );
    }

    const storageKey = `instagram/${randomUUID()}.jpg`;
    await this.storage.put(storageKey, file.buffer, 'image/jpeg');
    const media = await this.prisma.instagramMedia.create({
      data: { storageKey, ...size, sizeBytes: file.size },
    });
    return {
      id: media.id,
      width: media.width,
      height: media.height,
      url: await this.signedMediaUrl(media.id),
    };
  }

  /**
   * Cria o post com imagens já enviadas, na ordem recebida. Agendado; ou, com `publishNow`, já
   * marcado como "Publicando" (ninguém mais pega o post enquanto ele é enviado).
   */
  async create(dto: CreateInstagramPostDto) {
    await this.requireConnectedAccount(
      dto.publishNow
        ? 'Conecte o Instagram para publicar.'
        : 'Conecte o Instagram para agendar posts.',
    );
    const now = new Date();
    const scheduledAt = dto.publishNow ? now : new Date(dto.scheduledAt!);
    // 1 minuto de folga para o relógio do navegador
    if (scheduledAt.getTime() < now.getTime() - 60_000) {
      throw new BadRequestException('Escolha um horário no futuro.');
    }
    if (countHashtags(dto.caption) > HASHTAG_LIMIT) {
      throw new BadRequestException(`Use no máximo ${HASHTAG_LIMIT} hashtags.`);
    }

    const postId = await this.prisma.$transaction(async (tx) => {
      const post = await tx.instagramPost.create({
        data: {
          caption: dto.caption,
          scheduledAt,
          ...(dto.publishNow
            ? { status: 'PUBLISHING', publishingStartedAt: now }
            : {}),
        },
      });
      // Só imagens soltas: prende cada uma de uma vez (duas abas agendando juntas não dividem imagem)
      for (const [position, id] of dto.mediaIds.entries()) {
        const { count } = await tx.instagramMedia.updateMany({
          where: { id, postId: null },
          data: { postId: post.id, position },
        });
        if (count === 0) {
          throw new BadRequestException(
            'Alguma imagem não foi encontrada. Envie as imagens de novo.',
          );
        }
      }
      return post.id;
    });
    return this.findOne(postId);
  }

  /**
   * Primeiro os que ainda não saíram (agendados, publicando, com falha), do mais próximo ao mais
   * distante; depois os publicados, do mais recente ao mais antigo (só os últimos 20).
   */
  async list() {
    const include = { images: { orderBy: { position: 'asc' as const } } };
    const [pending, published] = await Promise.all([
      this.prisma.instagramPost.findMany({
        where: { status: { notIn: SENT } },
        orderBy: { scheduledAt: 'asc' },
        include,
      }),
      this.prisma.instagramPost.findMany({
        where: { status: { in: SENT } },
        orderBy: { publishedAt: 'desc' },
        take: PUBLISHED_IN_LIST,
        include,
      }),
    ]);
    return Promise.all(
      [...pending, ...published].map((post) => this.toView(post)),
    );
  }

  /**
   * Cancela (ou tira da lista um removido do Instagram): apaga o post e as imagens. As imagens são soltas na mesma transação; se apagar no
   * armazenamento falhar agora, o cron diário termina o serviço.
   */
  async cancel(id: string) {
    const images = await this.prisma.$transaction(async (tx) => {
      const post = await tx.instagramPost.findUnique({
        where: { id },
        select: { images: { select: { id: true, storageKey: true } } },
      });
      if (!post) throw new NotFoundException('Post não encontrado');

      await tx.instagramMedia.updateMany({
        where: { postId: id },
        data: { postId: null },
      });
      // Condição no próprio DELETE: se o post começou a ser publicado agora, nada muda
      const { count } = await tx.instagramPost.deleteMany({
        where: { id, status: { in: CANCELABLE } },
      });
      if (count === 0) {
        throw new ConflictException('Esse post já foi enviado ao Instagram.');
      }
      return post.images;
    });

    try {
      await this.deleteMedia(images);
    } catch (error) {
      this.logger.warn(
        `Imagens do post ${id} ficam para o cron: ${(error as Error).message}`,
      );
    }
  }

  /** Cron diário: apaga imagens enviadas há mais de 24 h que nunca entraram num post. */
  async cleanupOrphanMedia(now = new Date()) {
    const orphans = await this.prisma.instagramMedia.findMany({
      where: {
        postId: null,
        createdAt: { lt: new Date(now.getTime() - ORPHAN_MEDIA_MS) },
      },
      select: { id: true, storageKey: true },
      take: 1000,
    });
    await this.deleteMedia(orphans);
    return { deleted: orphans.length };
  }

  /** Conteúdo da imagem, para quem tem um link assinado válido (a tela e o Instagram, ao publicar). */
  async openMedia(id: string, token: string | undefined) {
    try {
      await this.jwtService.verifyAsync(token ?? '', {
        audience: MEDIA_URL_AUDIENCE,
        subject: id,
      });
    } catch {
      throw new ForbiddenException('Link da imagem inválido ou expirado');
    }
    const media = await this.prisma.instagramMedia.findUnique({
      where: { id },
    });
    if (!media) throw new NotFoundException('Imagem não encontrada');
    return {
      stream: await this.storage.get(media.storageKey),
      sizeBytes: media.sizeBytes,
    };
  }

  /** Link de leitura da imagem, válido por 1 hora (o bucket continua privado). */
  private async signedMediaUrl(id: string) {
    const token = await this.jwtService.signAsync(
      {},
      { audience: MEDIA_URL_AUDIENCE, subject: id, expiresIn: MEDIA_URL_TTL },
    );
    return `/api/instagram/media/${id}?token=${token}`;
  }

  /** Link completo da imagem, para a Meta baixar ao publicar (`origin`: endereço público do site). */
  async publicMediaUrl(id: string, origin: string) {
    return `${origin}${await this.signedMediaUrl(id)}`;
  }

  async findOne(id: string) {
    const post = await this.prisma.instagramPost.findUniqueOrThrow({
      where: { id },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    return this.toView(post);
  }

  private async toView(post: {
    id: string;
    caption: string;
    scheduledAt: Date;
    status: InstagramPostStatus;
    error: string | null;
    publishedAt: Date | null;
    permalink: string | null;
    createdAt: Date;
    images: { id: string; width: number; height: number }[];
  }) {
    return {
      id: post.id,
      caption: post.caption,
      scheduledAt: post.scheduledAt,
      status: post.status,
      // Só a falha definitiva: numa nova tentativa automática o post segue "Agendado"
      error: post.status === 'FAILED' ? post.error : null,
      publishedAt: post.publishedAt,
      permalink: post.permalink,
      createdAt: post.createdAt,
      images: await Promise.all(
        post.images.map(async ({ id, width, height }) => ({
          id,
          width,
          height,
          url: await this.signedMediaUrl(id),
        })),
      ),
    };
  }

  /** Apaga do armazenamento e depois do banco (se o armazenamento falhar, o registro fica para o cron). */
  private async deleteMedia(media: MediaRef[]) {
    if (media.length === 0) return;
    await this.storage.deleteMany(media.map((item) => item.storageKey));
    await this.prisma.instagramMedia.deleteMany({
      where: { id: { in: media.map((item) => item.id) } },
    });
  }

  private async requireConnectedAccount(message: string) {
    const account = await this.prisma.instagramAccount.findFirst({
      where: { tokenInvalidAt: null, tokenExpiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!account) throw new ConflictException(message);
  }
}

function countHashtags(caption: string) {
  return caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
}
