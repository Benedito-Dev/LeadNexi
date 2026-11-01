import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

/** Remarcar um post (arrastar no calendário ou escolher novo horário) ou tirá-lo da agenda. */
export class UpdateInstagramPostDto {
  /**
   * Novo horário (ISO 8601, com fuso). Só para agendado, com falha ou rascunho.
   * @example "2026-10-20T12:00:00.000Z"
   */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  /** true: tira da agenda e volta a ser rascunho, sem data (só agendado ou com falha) */
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
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
