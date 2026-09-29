import { LeadEntity } from '../../leads/entities/lead.entity.js';

export class StageEntity {
  id: string;
  name: string;
  color: string | null;
  /** Ordem da coluna no pipeline (0 = primeira) */
  position: number;
  pipelineId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StageWithLeadsEntity extends StageEntity {
  /** Leads da etapa, ordenados por posição */
  leads: LeadEntity[];
}
