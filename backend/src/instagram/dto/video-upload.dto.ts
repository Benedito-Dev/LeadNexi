import { IsIn, IsInt, Max, Min } from 'class-validator';

/** Formatos de vídeo que o Instagram aceita num Reel */
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const;
/** Limites do Reel publicado pela API (documentação da Meta): até 300 MB, de 3 s a 15 min */
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
export const MIN_VIDEO_MS = 3_000;
export const MAX_VIDEO_MS = 15 * 60 * 1000;

/** O navegador lê o vídeo antes de enviar: formato, tamanho, medidas e duração. */
export class StartVideoUploadDto {
  @IsIn(VIDEO_MIME_TYPES, { message: 'O vídeo precisa ser MP4 ou MOV.' })
  mimeType: (typeof VIDEO_MIME_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(MAX_VIDEO_BYTES, { message: 'O vídeo pode ter no máximo 300 MB.' })
  sizeBytes: number;

  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
  height: number;

  @IsInt()
  @Min(MIN_VIDEO_MS, { message: 'O vídeo precisa ter pelo menos 3 segundos.' })
  @Max(MAX_VIDEO_MS, { message: 'O vídeo pode ter no máximo 15 minutos.' })
  durationMs: number;
}
