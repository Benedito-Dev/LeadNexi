import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { INSIGHT_PERIODS, type InsightPeriod } from '../instagram-insights.service.js';

/** Período das estatísticas: últimos 7 ou 30 dias (padrão: 7). */
export class QueryInsightsDto {
  /** @example 7 */
  @IsOptional()
  @Type(() => Number)
  @IsIn(INSIGHT_PERIODS)
  days?: InsightPeriod;
}
