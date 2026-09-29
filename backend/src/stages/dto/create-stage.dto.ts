import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStageDto {
  /**
   * Nome da etapa (coluna do Kanban)
   * @example "Proposta"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  /**
   * Cor da coluna em hexadecimal
   * @example "#3B82F6"
   */
  @IsOptional()
  @IsHexColor()
  color?: string;
}
