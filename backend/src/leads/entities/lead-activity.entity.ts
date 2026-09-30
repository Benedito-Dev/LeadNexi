import { ApiProperty } from '@nestjs/swagger';
import { LeadActivityType } from '../../generated/prisma/client.js';

export class LeadActivityEntity {
  id: string;
  leadId: string;

  @ApiProperty({ enum: LeadActivityType, enumName: 'LeadActivityType' })
  type: LeadActivityType;

  /** Texto da nota, origem (na criação), descrição do follow-up ou mensagem do direct */
  text: string | null;
  /** Nome da etapa de origem, no momento da mudança */
  fromStage: string | null;
  /** Nome da etapa de destino (ou onde o lead foi criado) */
  toStage: string | null;
  /** Data do follow-up agendado ou concluído */
  dueAt: Date | null;
  createdAt: Date;
}
