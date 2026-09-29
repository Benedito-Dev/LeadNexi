import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Limites do Instagram para um post (foto única ou carrossel) */
export const CAPTION_LIMIT = 2200;
export const HASHTAG_LIMIT = 30;
export const MAX_IMAGES = 10;

export class CreateInstagramPostDto {
  /**
   * Legenda (pode ficar vazia)
   * @example "Chegou coleção nova! #moda"
   */
  @IsString()
  @MaxLength(CAPTION_LIMIT)
  caption: string;

  /**
   * Quando publicar (ISO 8601, com fuso)
   * @example "2026-10-02T12:00:00.000Z"
   */
  @IsDateString()
  scheduledAt: string;

  /** Imagens já enviadas (POST /instagram/media), na ordem do carrossel: a primeira é a capa */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMAGES)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  mediaIds: string[];
}
