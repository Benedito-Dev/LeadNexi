import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
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

/** Texto opcional: vazio vira null (tira o campo) */
const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

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

  /**
   * O que dispara: comentário (padrão), resposta a story, menção no story ou palavra no direct
   * @example "COMMENT"
   */
  @IsOptional()
  @IsIn(['COMMENT', 'STORY_REPLY', 'STORY_MENTION', 'DM_KEYWORD'])
  trigger?: 'COMMENT' | 'STORY_REPLY' | 'STORY_MENTION' | 'DM_KEYWORD';

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

  /**
   * Botão embaixo da mensagem (até 20 caracteres); vazio ou null = só texto
   * @example "Quero o link"
   */
  @Transform(trimOrNull)
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(20)
  buttonLabel?: string | null;

  /**
   * O que chega quando a pessoa toca no botão (obrigatório com botão)
   * @example "Aqui está: https://exemplo.com/catalogo"
   */
  @Transform(trimOrNull)
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(AUTOMATION_MESSAGE_LIMIT)
  deliveryMessage?: string | null;

  /** Só entrega para quem segue a conta (precisa do botão) */
  @IsOptional()
  @IsBoolean()
  requireFollow?: boolean;

  /**
   * Para quem tocou e não segue; null = o texto padrão
   * @example "Me segue e toca de novo que eu te mando!"
   */
  @Transform(trimOrNull)
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(AUTOMATION_MESSAGE_LIMIT)
  notFollowingMessage?: string | null;

  /** No CRM: etapa para onde o lead vai (só para frente); null = não mexe */
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsUUID('4')
  stageId?: string | null;

  /** No CRM: lista em que o lead entra (se ainda estiver na lista padrão); null = não mexe */
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsUUID('4')
  listId?: string | null;
}

export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {}
