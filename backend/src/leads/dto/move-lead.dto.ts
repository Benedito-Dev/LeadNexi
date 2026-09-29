import { IsInt, IsUUID, Min } from 'class-validator';

export class MoveLeadDto {
  /** Etapa de destino (pode ser a mesma, para reordenar dentro da coluna) */
  @IsUUID('4')
  stageId: string;

  /**
   * Posição de destino na coluna (0 = topo). Valores acima do tamanho vão para o fim.
   * @example 0
   */
  @IsInt()
  @Min(0)
  position: number;
}
