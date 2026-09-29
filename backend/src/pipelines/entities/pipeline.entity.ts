import {
  StageEntity,
  StageWithLeadsEntity,
} from '../../stages/entities/stage.entity.js';

export class PipelineEntity {
  id: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PipelineSummaryEntity extends PipelineEntity {
  /** Etapas ordenadas por posição (sem os leads) */
  stages: StageEntity[];
}

export class PipelineBoardEntity extends PipelineEntity {
  /** Etapas ordenadas, cada uma com seus leads: tudo que o Kanban precisa */
  stages: StageWithLeadsEntity[];
}
