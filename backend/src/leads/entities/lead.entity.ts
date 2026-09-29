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
