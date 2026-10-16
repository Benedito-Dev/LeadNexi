import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryLeadsDto {
  /** Busca por nome, e-mail ou telefone */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID('4')
  pipelineId?: string;

  @IsOptional()
  @IsUUID('4')
  stageId?: string;

  /** Filtra pela origem exata */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  @IsOptional()
  @IsUUID('4')
  listId?: string;

  /** Por padrão, listas e leads arquivados ficam fora da operação. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  archived?: boolean;

  /** @example 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** @example 20 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
