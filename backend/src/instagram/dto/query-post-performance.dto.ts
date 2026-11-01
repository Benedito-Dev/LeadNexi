import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PERFORMANCE_DAYS, MAX_PERFORMANCE_LIMIT } from '../instagram-post-performance.service.js';
import {
  PERFORMANCE_SORTS,
  PERFORMANCE_TYPES,
  type PerformanceSort,
  type PerformanceType,
} from '../post-performance.metrics.js';

/** Filtros do ranking de desempenho dos posts. */
export class QueryPostPerformanceDto {
  /** Posts publicados nos últimos N dias (padrão 30, máx. 90) @example 30 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PERFORMANCE_DAYS)
  days?: number;

  /** @example "TODOS" */
  @IsOptional()
  @IsIn(PERFORMANCE_TYPES)
  type?: PerformanceType;

  /** reels_skip_rate ordena da menor para a maior; os outros, da maior para a menor @example "views" */
  @IsOptional()
  @IsIn(PERFORMANCE_SORTS)
  sortBy?: PerformanceSort;

  /** @example 10 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PERFORMANCE_LIMIT)
  limit?: number;

  /** true: lê na Meta mesmo com coleta de menos de 6 h */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  refresh?: boolean;
}
