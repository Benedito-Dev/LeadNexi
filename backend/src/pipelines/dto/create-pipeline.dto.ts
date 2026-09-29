import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateStageDto } from '../../stages/dto/create-stage.dto.js';

export class CreatePipelineDto {
  /**
   * Nome do funil
   * @example "Vendas"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  /** Etapas iniciais, criadas na ordem enviada */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages?: CreateStageDto[];
}
