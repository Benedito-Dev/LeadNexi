import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProofDto {
  /** Frase pronta para a IA citar */
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  text: string;

  /** Número em destaque, ex.: "R$ 2,26 por conversa" */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  highlight?: string | null;

  /** De onde saiu o número, ex.: "Gerenciador de Anúncios" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  source: string;

  /** Período ou data, ex.: "out/2026" */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referenceDate?: string | null;

  /** O cliente autorizou citar o nome da loja? */
  @IsOptional()
  @IsBoolean()
  canNameClient?: boolean;

  /** Desligada, a IA não usa */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProofDto extends PartialType(CreateProofDto) {}
