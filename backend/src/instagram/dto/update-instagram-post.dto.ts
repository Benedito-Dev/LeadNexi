import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** Remarcar um post (arrastar no calendário) ou marcá-lo como exemplo para o follow-up. */
export class UpdateInstagramPostDto {
  /**
   * Novo horário (ISO 8601, com fuso). Só para agendado ou com falha.
   * @example "2026-10-20T12:00:00.000Z"
   */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  /** Usar este post publicado como exemplo no follow-up */
  @IsOptional()
  @IsBoolean()
  isProof?: boolean;

  /**
   * Do que é o exemplo (aparece na hora de anexar)
   * @example "Case da loja de celular"
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  proofNote?: string | null;
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
