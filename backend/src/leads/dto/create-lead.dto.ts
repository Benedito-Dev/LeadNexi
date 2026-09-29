import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeadDto {
  /**
   * Nome do lead
   * @example "Maria Souza"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  /**
   * Telefone / WhatsApp, de preferência com DDI e DDD
   * @example "+5585999990000"
   */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  /** @example "maria@email.com" */
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  /**
   * De onde o lead veio
   * @example "Instagram"
   */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  /**
   * Valor estimado do negócio, com até 2 casas decimais
   * @example 1500.5
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;

  /** Observações livres */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  /** Etapa onde o lead será criado (entra no fim da coluna) */
  @IsUUID('4')
  stageId: string;
}
