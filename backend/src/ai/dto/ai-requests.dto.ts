import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const CHANNELS = ['whatsapp', 'instagram'] as const;
export type AiChannel = (typeof CHANNELS)[number];

export class GenerateMessageDto {
  /** Canal da mensagem (padrão: WhatsApp) */
  @IsOptional()
  @IsIn(CHANNELS)
  channel?: AiChannel;

  /** Passo da cadência: 1 = 1ª mensagem, 2 = follow-up 1, 3 = follow-up final. Padrão: o próximo do lead. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  step?: number;
}

export class SuggestReplyDto {
  @IsOptional()
  @IsIn(CHANNELS)
  channel?: AiChannel;

  /** Mensagem do lead colada pelo usuário. Sem ela, vale a última mensagem recebida no histórico. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
