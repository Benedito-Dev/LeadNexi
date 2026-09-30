import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Linhas por importação */
export const IMPORT_LIMIT = 1000;

/**
 * Uma linha da planilha, já com as colunas ligadas aos campos do lead. Os valores chegam como
 * estão na planilha: o serviço confere cada linha e diz o que há de errado nela, sem recusar o
 * resto da importação.
 */
export class ImportLeadRowDto {
  /** @example "Aki Pets" */
  @IsString()
  @MaxLength(500)
  name: string;

  /** @example "(85) 99999-0000" */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  /** @example "contato@akipets.com" */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  email?: string;

  /** Com ou sem o @, ou o link do perfil. @example "@akipets" */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagramUsername?: string;

  /** @example 1500.5 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  /** Colunas sem campo próprio, já juntas em texto ("Bairro: Messejana · Prioridade: Alta") */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  /** Etapa do lead (do status da planilha, ou a escolhida para quem não tem status) */
  @IsUUID('4')
  stageId: string;
}

export class ImportLeadsDto {
  /** Só confere (tela "Conferir"): diz o que entraria, sem gravar nada */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => ImportLeadRowDto)
  leads: ImportLeadRowDto[];
}
