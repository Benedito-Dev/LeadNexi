import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordWhatsAppDto {
  /** Texto que o usuário abriu no WhatsApp e confirmou como enviado. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}

export class RecordWhatsAppResponseDto {
  /** Texto da resposta, se o usuário quiser guardar o contexto. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;
}
