import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class RecordWhatsAppDto {
  /** Texto que o usuário abriu no WhatsApp e confirmou como enviado. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  variation?: string;
}

export class RecordWhatsAppResponseDto {
  /** Texto da resposta, se o usuário quiser guardar o contexto. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;
}

export const CONVERSATION_OUTCOMES = ['waiting', 'later', 'meeting', 'won', 'lost'] as const;
export type ConversationOutcome = (typeof CONVERSATION_OUTCOMES)[number];

export class RecordConversationDto {
  /**
   * Como ficou a conversa depois da sua resposta: aguardando o lead, retorno combinado,
   * reunião marcada, fechou ou sem interesse.
   */
  @IsIn(CONVERSATION_OUTCOMES)
  outcome: ConversationOutcome;

  /** Data do retorno combinado ou da reunião (obrigatória nesses dois casos). */
  @ValidateIf((dto: RecordConversationDto) => dto.outcome === 'later' || dto.outcome === 'meeting')
  @IsDateString()
  at?: string;
}
