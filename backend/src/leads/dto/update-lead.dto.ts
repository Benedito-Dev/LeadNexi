import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto.js';

// A troca de etapa é feita pelo endpoint PATCH /leads/:id/move
export class UpdateLeadDto extends PartialType(
  OmitType(CreateLeadDto, ['stageId'] as const),
) {}
