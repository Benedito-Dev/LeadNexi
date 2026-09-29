import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNoteDto {
  /**
   * Texto da anotação
   * @example "Pediu orçamento de 3 cadeiras"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
