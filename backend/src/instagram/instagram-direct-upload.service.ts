import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { readJpegSize } from '../common/utils/jpeg.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { MAX_DIRECT_IMAGE_BYTES, MAX_VIDEO_BYTES, StartImageUploadDto, StartVideoUploadDto } from './dto/video-upload.dto.js';
import { MAX_RATIO, MIN_RATIO, RATIO_TOLERANCE } from './instagram-posts.service.js';

/** Audiência do JWT do envio local (só desenvolvimento, sem bucket) */
const UPLOAD_AUDIENCE = 'instagram-video-upload';
/** Tempo para terminar de enviar o arquivo */
const UPLOAD_TTL_SECONDS = 30 * 60;
/** Capa do Reel: JPEG de até 8 MB (especificação da Meta) */
const MAX_POSTER_BYTES = 8 * 1024 * 1024;

const extensao = (mimeType: string) => (mimeType === 'video/quicktime' ? 'mov' : 'mp4');
const chaveDaCapa = (storageKey: string) => storageKey.replace(/\.\w+$/, '-capa.jpg');

/** Um link de envio: PUT direto no bucket, ou (sem bucket) na própria API. */
type LinkDeEnvio = { url: string; headers: Record<string, string> };

/**
 * Envio direto ao armazenamento: o arquivo vai do navegador (ou do agente na VPS) para o bucket
 * por um link assinado de PUT, sem passar pela API (o vídeo passa dos 4,5 MB da Vercel). Passos:
 * começar (registro pendente + links), enviar o arquivo (e a capa, no vídeo) e confirmar (confere
 * o que chegou e libera para entrar num post). Sem bucket (pasta local, desenvolvimento), os links
 * apontam para a própria API.
 */
@Injectable()
export class InstagramDirectUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  /** Vídeo de Reel: devolve o link do vídeo e o da capa (a tela manda a capa pela API; o agente, pelo link). */
  async start(dto: StartVideoUploadDto) {
    const storageKey = `instagram/${randomUUID()}.${extensao(dto.mimeType)}`;
    const posterKey = chaveDaCapa(storageKey);
    const media = await this.prisma.instagramMedia.create({
      data: {
        kind: 'VIDEO',
        storageKey,
        posterKey,
        width: dto.width,
        height: dto.height,
        sizeBytes: dto.sizeBytes,
        mimeType: dto.mimeType,
        durationMs: dto.durationMs,
        pending: true,
      },
      select: { id: true },
    });
    const video = await this.link(media.id, storageKey, dto.mimeType);
    const capa = await this.link(media.id, posterKey, 'image/jpeg', 'capa');
    return { id: media.id, uploadUrl: video.url, headers: video.headers, posterUploadUrl: capa.url, posterHeaders: capa.headers };
  }

  /** Imagem pelo caminho direto (o agente na VPS): medidas e proporção são conferidas ao confirmar. */
  async startImage(dto: StartImageUploadDto) {
    const storageKey = `instagram/${randomUUID()}.jpg`;
    const media = await this.prisma.instagramMedia.create({
      data: { kind: 'IMAGE', storageKey, width: 0, height: 0, sizeBytes: dto.sizeBytes, pending: true },
      select: { id: true },
    });
    const imagem = await this.link(media.id, storageKey, dto.mimeType);
    return { id: media.id, uploadUrl: imagem.url, headers: imagem.headers };
  }

  /** Envio local (sem bucket): a própria API recebe o arquivo (ou a capa). Só no desenvolvimento. */
  async receiveLocal(id: string, token: string | undefined, body: Readable, parte?: string) {
    if (!this.storage.isLocal) throw new NotFoundException();
    try {
      await this.jwtService.verifyAsync(token ?? '', { audience: UPLOAD_AUDIENCE, subject: id });
    } catch {
      throw new ForbiddenException('Link de envio inválido ou expirado');
    }
    const media = await this.pending(id);
    const capa = parte === 'capa';
    if (capa && !media.posterKey) throw new BadRequestException('Esta mídia não tem capa.');
    const limite = capa ? MAX_POSTER_BYTES : media.kind === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_DIRECT_IMAGE_BYTES;
    const partes: Buffer[] = [];
    let total = 0;
    for await (const parte of body) {
      total += (parte as Buffer).length;
      if (total > limite) throw new BadRequestException('O arquivo passou do tamanho permitido.');
      partes.push(parte as Buffer);
    }
    const chave = capa ? media.posterKey! : media.storageKey;
    await this.storage.put(chave, Buffer.concat(partes), capa ? 'image/jpeg' : (media.mimeType ?? 'image/jpeg'));
  }

  /** Capa do Reel enviada pela API (a tela): um quadro do vídeo em JPEG, tirado no navegador. */
  async savePoster(id: string, file: { buffer: Buffer } | undefined) {
    const media = await this.pending(id);
    if (media.kind !== 'VIDEO') throw new NotFoundException('Vídeo não encontrado');
    if (!file) throw new BadRequestException('Envie a capa no campo "file".');
    if (file.buffer.length > MAX_POSTER_BYTES) throw new BadRequestException('A capa pode ter no máximo 8 MB.');
    if (!readJpegSize(file.buffer)) throw new UnsupportedMediaTypeException('A capa precisa estar em JPEG.');
    const posterKey = media.posterKey ?? chaveDaCapa(media.storageKey);
    await this.storage.put(posterKey, file.buffer, 'image/jpeg');
    await this.prisma.instagramMedia.update({ where: { id }, data: { posterKey } });
    return { id };
  }

  /** O envio terminou: confere o que chegou ao armazenamento e libera a mídia para entrar num post. */
  async complete(id: string) {
    const media = await this.pending(id);
    const tamanho = await this.storage.size(media.storageKey);
    if (tamanho === null) throw new ConflictException('O arquivo ainda não chegou ao armazenamento. Envie de novo.');

    if (media.kind === 'IMAGE') {
      // Imagem pelo caminho direto: confere JPEG e proporção aqui (o envio pela API confere na hora)
      const medidas = readJpegSize(await this.lerTudo(media.storageKey));
      if (!medidas) throw new UnsupportedMediaTypeException('A imagem precisa estar em JPEG.');
      const proporcao = medidas.width / medidas.height;
      if (proporcao < MIN_RATIO - RATIO_TOLERANCE || proporcao > MAX_RATIO + RATIO_TOLERANCE) {
        throw new BadRequestException('A proporção da imagem precisa ficar entre 4:5 e 1,91:1.');
      }
      await this.prisma.instagramMedia.update({ where: { id }, data: { pending: false, sizeBytes: tamanho, ...medidas } });
      return { id, sizeBytes: tamanho, ...medidas };
    }

    if (Math.abs(tamanho - media.sizeBytes) > 1024) throw new ConflictException('O vídeo chegou incompleto. Envie de novo.');
    if (!media.posterKey || (await this.storage.size(media.posterKey)) === null) {
      throw new BadRequestException('Envie a capa do vídeo antes de confirmar.');
    }
    await this.prisma.instagramMedia.update({ where: { id }, data: { pending: false, sizeBytes: tamanho } });
    return { id, sizeBytes: tamanho };
  }

  /** Link de PUT direto no bucket; sem bucket, a rota local da API (com um token curto). */
  private async link(id: string, chave: string, contentType: string, parte?: 'capa'): Promise<LinkDeEnvio> {
    const direto = await this.storage.presignUpload(chave, contentType, UPLOAD_TTL_SECONDS);
    if (direto) return { url: direto, headers: { 'Content-Type': contentType } };
    const token = await this.jwtService.signAsync({}, { audience: UPLOAD_AUDIENCE, subject: id, expiresIn: UPLOAD_TTL_SECONDS });
    return { url: `/api/instagram/media/${id}/upload?token=${token}${parte ? `&parte=${parte}` : ''}`, headers: { 'Content-Type': contentType } };
  }

  private async lerTudo(chave: string) {
    const partes: Buffer[] = [];
    for await (const parte of await this.storage.get(chave)) partes.push(parte as Buffer);
    return Buffer.concat(partes);
  }

  private async pending(id: string) {
    const media = await this.prisma.instagramMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    if (!media.pending) throw new ConflictException('Essa mídia já foi confirmada.');
    return media;
  }
}
