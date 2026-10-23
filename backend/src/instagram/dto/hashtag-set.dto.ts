import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateHashtagSetDto {
  /**
   * Nome do grupo
   * @example "Lojas de celular"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  /**
   * As hashtags (com ou sem #, separadas por espaço ou vírgula)
   * @example "#celular #fortaleza #assistenciatecnica"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  tags: string;
}
