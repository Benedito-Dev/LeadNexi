import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { readJpegSize } from '../common/utils/jpeg.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { MAX_VIDEO_BYTES, StartVideoUploadDto } from './dto/video-upload.dto.js';

/** Audiência do JWT do envio local (só desenvolvimento, sem bucket) */
const UPLOAD_AUDIENCE = 'instagram-video-upload';
/** Tempo para o navegador terminar de enviar o vídeo */
const UPLOAD_TTL_SECONDS = 30 * 60;
/** Capa do Reel: JPEG de até 8 MB (especificação da Meta) */
const MAX_POSTER_BYTES = 8 * 1024 * 1024;

const extensao = (mimeType: string) => (mimeType === 'video/quicktime' ? 'mov' : 'mp4');

/**
 * Vídeo de Reel: o arquivo vai do navegador direto para o bucket (link assinado de PUT), porque
 * passa do limite de 4,5 MB por requisição da Vercel. Passos: começar (registro + link), enviar
 * a capa (um quadro em JPEG, tirado no navegador) e confirmar (confere que o arquivo chegou).
 * Sem bucket (pasta local, desenvolvimento), o link de envio aponta para a própria API.
 */
@Injectable()
export class InstagramVideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  async start(dto: StartVideoUploadDto) {
    const storageKey = `instagram/${randomUUID()}.${extensao(dto.mimeType)}`;
    const media = await this.prisma.instagramMedia.create({
      data: {
        kind: 'VIDEO',
        storageKey,
        width: dto.width,
        height: dto.height,
        sizeBytes: dto.sizeBytes,
        mimeType: dto.mimeType,
        durationMs: dto.durationMs,
        pending: true,
      },
      select: { id: true },
    });
    const direto = await this.storage.presignUpload(storageKey, dto.mimeType, UPLOAD_TTL_SECONDS);
    const uploadUrl =
      direto ??
      `/api/instagram/media/${media.id}/upload?token=${await this.jwtService.signAsync({}, { audience: UPLOAD_AUDIENCE, subject: media.id, expiresIn: UPLOAD_TTL_SECONDS })}`;
    return { id: media.id, uploadUrl, headers: { 'Content-Type': dto.mimeType } };
  }

  /** Envio local (sem bucket): a própria API recebe o arquivo. Só no desenvolvimento. */
  async receiveLocal(id: string, token: string | undefined, body: Readable) {
    if (!this.storage.isLocal) throw new NotFoundException();
    try {
      await this.jwtService.verifyAsync(token ?? '', { audience: UPLOAD_AUDIENCE, subject: id });
    } catch {
      throw new ForbiddenException('Link de envio inválido ou expirado');
    }
    const media = await this.pendingVideo(id);
    const partes: Buffer[] = [];
    let total = 0;
    for await (const parte of body) {
      total += (parte as Buffer).length;
      if (total > MAX_VIDEO_BYTES) throw new BadRequestException('O vídeo pode ter no máximo 300 MB.');
      partes.push(parte as Buffer);
    }
    await this.storage.put(media.storageKey, Buffer.concat(partes), media.mimeType ?? 'video/mp4');
  }

  /** Capa do Reel: um quadro do vídeo em JPEG, tirado no navegador. */
  async savePoster(id: string, file: { buffer: Buffer } | undefined) {
    const media = await this.pendingVideo(id);
    if (!file) throw new BadRequestException('Envie a capa no campo "file".');
    if (file.buffer.length > MAX_POSTER_BYTES) throw new BadRequestException('A capa pode ter no máximo 8 MB.');
    if (!readJpegSize(file.buffer)) throw new UnsupportedMediaTypeException('A capa precisa estar em JPEG.');
    const posterKey = media.storageKey.replace(/\.\w+$/, '-capa.jpg');
    await this.storage.put(posterKey, file.buffer, 'image/jpeg');
    await this.prisma.instagramMedia.update({ where: { id }, data: { posterKey } });
    return { id };
  }

  /** O navegador terminou de enviar: confere o arquivo no armazenamento e libera o vídeo para entrar num post. */
  async complete(id: string) {
    const media = await this.pendingVideo(id);
    if (!media.posterKey) throw new BadRequestException('Envie a capa do vídeo antes de confirmar.');
    const tamanho = await this.storage.size(media.storageKey);
    if (tamanho === null) throw new ConflictException('O vídeo ainda não chegou ao armazenamento. Envie de novo.');
    if (Math.abs(tamanho - media.sizeBytes) > 1024) {
      throw new ConflictException('O vídeo chegou incompleto. Envie de novo.');
    }
    await this.prisma.instagramMedia.update({ where: { id }, data: { pending: false, sizeBytes: tamanho } });
    return { id, sizeBytes: tamanho };
  }

  private async pendingVideo(id: string) {
    const media = await this.prisma.instagramMedia.findUnique({ where: { id } });
    if (!media || media.kind !== 'VIDEO') throw new NotFoundException('Vídeo não encontrado');
    if (!media.pending) throw new ConflictException('Esse vídeo já foi confirmado.');
    return media;
  }
}
