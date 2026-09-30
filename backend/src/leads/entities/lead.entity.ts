import { ApiProperty } from '@nestjs/swagger';

export class LeadEntity {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '1500.5',
    description: 'Decimal serializado como string para não perder precisão',
  })
  estimatedValue: string | null;

  notes: string | null;
  /** Ordem do card na coluna (0 = topo) */
  position: number;
  stageId: string;
  /** Próximo contato agendado; null = nenhum */
  followUpAt: Date | null;
  /** O que fazer no próximo contato */
  followUpNote: string | null;
  /** @ do Instagram (sem o @) */
  instagramUsername: string | null;
  /** ID de quem mandou direct (liga as mensagens novas ao lead) */
  instagramUserId: string | null;
  /** Última mensagem do lead no direct: dá para responder até 24 h depois */
  instagramLastMessageAt: Date | null;
  /** Foto de perfil guardada (GET /leads/avatars/:avatarId); null = mostrar as iniciais */
  avatarId: string | null;
  avatarUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadStageSummaryEntity {
  id: string;
  name: string;
  pipelineId: string;
}

export class LeadWithStageEntity extends LeadEntity {
  stage: LeadStageSummaryEntity;
}

export class PaginationMetaEntity {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedLeadsEntity {
  data: LeadWithStageEntity[];
  meta: PaginationMetaEntity;
}
