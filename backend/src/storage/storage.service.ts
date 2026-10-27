import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

/** O DeleteObjects da API S3 aceita no máximo 1.000 chaves por chamada */
const DELETE_BATCH = 1000;

/**
 * Armazenamento de arquivos no padrão S3 (hoje: Telnyx Cloud Storage; serve R2, AWS S3...).
 * Só as operações básicas (gravar, ler, apagar), suportadas por qualquer provedor e região:
 * trocar de provedor é trocar as variáveis STORAGE_*. O bucket fica privado; quem mostra os
 * arquivos é a API, com links assinados (ver InstagramPostsService.signedMediaUrl).
 *
 * Só no desenvolvimento: sem as chaves do S3 e com STORAGE_LOCAL_DIR definido, os arquivos ficam
 * nessa pasta da máquina (para ver imagens de post e fotos de lead sem acesso à nuvem).
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly localDir: string | null;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('STORAGE_ENDPOINT');
    const region = config.get<string>('STORAGE_REGION');
    const accessKeyId = config.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('STORAGE_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('STORAGE_BUCKET') ?? '';

    const ready =
      endpoint && region && accessKeyId && secretAccessKey && this.bucket;
    this.client = ready
      ? new S3Client({
          endpoint,
          region,
          credentials: { accessKeyId, secretAccessKey },
          // Bucket no caminho (endpoint/bucket/chave): o formato aceito por todos os provedores
          forcePathStyle: true,
          // Checksums só quando a operação exige: provedores compatíveis recusam os extras
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
        })
      : null;
    const localDir = config.get<string>('STORAGE_LOCAL_DIR');
    this.localDir = !this.client && localDir ? resolve(localDir) : null;
  }

  get configured() {
    return this.client !== null || this.localDir !== null;
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (this.localDir) {
      const path = this.localPath(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return;
    }
    await this.requireClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Conteúdo do arquivo como stream (para repassar na resposta sem carregar tudo na memória). */
  async get(key: string): Promise<Readable> {
    if (this.localDir) return createReadStream(this.localPath(key));
    const result = await this.requireClient().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!(result.Body instanceof Readable)) {
      throw new Error(`Arquivo ${key} sem conteúdo`);
    }
    return result.Body;
  }

  async deleteMany(keys: string[]) {
    if (this.localDir) {
      await Promise.all(keys.map((key) => rm(this.localPath(key), { force: true })));
      return;
    }
    for (let start = 0; start < keys.length; start += DELETE_BATCH) {
      const batch = keys.slice(start, start + DELETE_BATCH);
      await this.requireClient().send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }

  /** Pasta local (só no desenvolvimento): o navegador não tem link direto para ela. */
  get isLocal() {
    return this.localDir !== null;
  }

  /**
   * Link para o navegador enviar o arquivo direto ao bucket (PUT), sem passar pela API (o vídeo
   * passa dos 4,5 MB da Vercel). `null` na pasta local: aí quem recebe é a própria API.
   */
  async presignUpload(key: string, contentType: string, expiresInSeconds: number) {
    if (this.localDir) return null;
    return getSignedUrl(this.requireClient(), new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), {
      expiresIn: expiresInSeconds,
    });
  }

  /** Link direto para ler o arquivo (vídeo no navegador, com avanço; e para a Meta baixar). `null` na pasta local. */
  async presignDownload(key: string, expiresInSeconds: number) {
    if (this.localDir) return null;
    return getSignedUrl(this.requireClient(), new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }

  /** Tamanho do arquivo guardado, ou `null` se ele não está lá (confere se o envio direto chegou). */
  async size(key: string): Promise<number | null> {
    try {
      if (this.localDir) return (await stat(this.localPath(key))).size;
      const head = await this.requireClient().send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  /** Caminho do arquivo na pasta local, sem deixar a chave sair dela (ex.: "../"). */
  private localPath(key: string) {
    const path = resolve(this.localDir!, key);
    if (!path.startsWith(this.localDir! + sep)) throw new Error(`Chave inválida: ${key}`);
    return path;
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'O armazenamento de imagens ainda não foi configurado no servidor.',
      );
    }
    return this.client;
  }
}
