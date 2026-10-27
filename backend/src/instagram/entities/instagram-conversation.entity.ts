import { ApiProperty } from '@nestjs/swagger';

export class InstagramMessageEntity {
  id: string;

  @ApiProperty({ enum: ['received', 'sent'] })
  direction: 'received' | 'sent';

  text: string;
  /** Reação da conta a esta mensagem (emoji), se houver */
  reaction: string | null;
  /** Reação do lead a esta mensagem (emoji), se houver */
  leadReaction: string | null;
  /** Mensagem que esta responde (citada), se houver */
  replyTo: InstagramQuotedMessageEntity | null;
  createdAt: Date;
}

export class InstagramQuotedMessageEntity {
  id: string;

  @ApiProperty({ enum: ['received', 'sent'] })
  direction: 'received' | 'sent';

  text: string;
}

export class InstagramConversationEntity {
  /** Dá para responder pelo LeadNexi agora */
  canReply: boolean;

  @ApiProperty({
    enum: ['no-direct', 'window-closed', 'reconnect'],
    nullable: true,
    description:
      'Por que não dá: o lead nunca mandou direct, passaram 24 h ou a conexão expirou',
  })
  blocked: 'no-direct' | 'window-closed' | 'reconnect' | null;

  /** Até quando dá para responder (24 h depois da última mensagem do lead) */
  replyUntil: Date | null;

  /** Mais antiga primeiro */
  messages: InstagramMessageEntity[];
}
