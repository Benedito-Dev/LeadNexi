import { IsDateString, IsOptional } from 'class-validator';

/** Remarcar um post (arrastar no calendário). */
export class UpdateInstagramPostDto {
  /**
   * Novo horário (ISO 8601, com fuso). Só para agendado ou com falha.
   * @example "2026-10-20T12:00:00.000Z"
   */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

/** Período do calendário: posts agendados ou publicados entre `from` e `to`. */
export class QueryInstagramPostsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
