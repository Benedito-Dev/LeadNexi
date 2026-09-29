import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
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
