import { IsString, MaxLength } from 'class-validator';

export class SendWhatsAppMessageDto {
  /**
   * Texto da mensagem
   * @example "Oi, Marcos! Pode ser amanhã às 10h, sim."
   */
  @IsString()
  @MaxLength(4096)
  text: string;
}
