import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SaveInstagramSettingsDto {
  /**
   * "ID do app do Instagram" (só números)
   * @example "2031084050892157"
   */
  @IsString()
  @Matches(/^\d{5,30}$/, {
    message: 'O ID do app do Instagram tem só números.',
  })
  appId: string;

  /**
   * "Chave secreta do app do Instagram". Omitida: mantém a que já está salva.
   * @example "0123456789abcdef0123456789abcdef"
   */
  @IsOptional()
  @IsString()
  @MinLength(16, { message: 'A chave secreta parece incompleta.' })
  @MaxLength(256)
  appSecret?: string;
}
