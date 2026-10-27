import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendInstagramMessageDto {
  /**
   * Texto do direct (até 1.000 bytes em UTF-8: acento e emoji ocupam mais de 1)
   * @example "Oi, Maria! Temos sim, no tamanho M."
   */
  @IsString()
  @MaxLength(1000)
  text: string;

  /** Mensagem da conversa que esta responde (aparece citada no Instagram) */
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
