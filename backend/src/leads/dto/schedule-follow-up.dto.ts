import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ScheduleFollowUpDto {
  /**
   * Quando falar com o lead de novo (ISO 8601, com fuso)
   * @example "2026-10-02T14:00:00.000Z"
   */
  @IsDateString()
  dueAt: string;

  /**
   * O que fazer nesse contato
   * @example "Ligar para fechar o orçamento"
   */
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
