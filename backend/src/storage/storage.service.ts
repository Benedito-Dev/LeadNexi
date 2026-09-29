import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';

/** O DeleteObjects da API S3 aceita no máximo 1.000 chaves por chamada */
const DELETE_BATCH = 1000;

/**
 * Armazenamento de arquivos no padrão S3 (hoje: Telnyx Cloud Storage; serve R2, AWS S3...).
 * Só as operações básicas (gravar, ler, apagar), suportadas por qualquer provedor e região:
 * trocar de provedor é trocar as variáveis STORAGE_*. O bucket fica privado; quem mostra os
 * arquivos é a API, com links assinados (ver InstagramPostsService.signedMediaUrl).
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;

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
  }

  get configured() {
    return this.client !== null;
  }

  async put(key: string, body: Buffer, contentType: string) {
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
    const result = await this.requireClient().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!(result.Body instanceof Readable)) {
      throw new Error(`Arquivo ${key} sem conteúdo`);
    }
    return result.Body;
  }

  async deleteMany(keys: string[]) {
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

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'O armazenamento de imagens ainda não foi configurado no servidor.',
      );
    }
    return this.client;
  }
}
