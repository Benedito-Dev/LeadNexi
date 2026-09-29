import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderStagesDto {
  /**
   * IDs de TODAS as etapas do pipeline, na nova ordem
   * @example ["5f0c...", "9a1b...", "c7d2..."]
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  stageIds: string[];
}
