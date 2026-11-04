import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Limite do texto no direct (o da Meta é 1.000 bytes; o envio confere em bytes) */
export const AUTOMATION_MESSAGE_LIMIT = 1000;
/** Limite de resposta pública a comentário */
const PUBLIC_REPLY_LIMIT = 300;

/** Lista de textos: tira espaço das pontas, vazios e repetidos */
const cleanList = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.map((item) => (typeof item === 'string' ? item.trim() : item)),
        ),
      ].filter((item) => item !== '')
    : value;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAutomationDto {
  /**
   * Nome para achar na lista
   * @example "Link do catálogo"
   */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  /** Ligada (dispara) ou pausada */
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /**
   * Posts na Meta que disparam; vazio = qualquer post ou Reel
   * @example ["18012345678901234"]
   */
  @IsOptional()
  @Transform(cleanList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  mediaIds?: string[];

  /**
   * Palavras que disparam (sem diferença de maiúscula e acento); vazio = qualquer comentário
   * @example ["quero", "link"]
   */
  @IsOptional()
  @Transform(cleanList)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  keywords?: string[];

  /**
   * Mensagem no direct de quem comentou
   * @example "Oi! Aqui está o link do catálogo: https://exemplo.com"
   */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(AUTOMATION_MESSAGE_LIMIT)
  message: string;

  /**
   * Respostas públicas no comentário (uma sorteada a cada vez); vazio = não responde em público
   * @example ["Te mandei no direct!", "Corre no direct que mandei lá"]
   */
  @IsOptional()
  @Transform(cleanList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(PUBLIC_REPLY_LIMIT, { each: true })
  publicReplies?: string[];
}

export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {}
