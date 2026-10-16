import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsIn,
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

  /** Papel semântico da etapa para métricas e regras do funil. */
  @IsOptional()
  @IsIn(['CONTACT', 'SENT', 'RESPONDED', 'MEETING', 'PROPOSAL', 'WON', 'LOST', 'CUSTOM'])
  stageType?: 'CONTACT' | 'SENT' | 'RESPONDED' | 'MEETING' | 'PROPOSAL' | 'WON' | 'LOST' | 'CUSTOM';
}
