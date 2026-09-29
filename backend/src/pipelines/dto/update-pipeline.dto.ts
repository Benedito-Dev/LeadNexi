import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePipelineDto } from './create-pipeline.dto.js';

// As etapas são gerenciadas pelos endpoints de stages
export class UpdatePipelineDto extends PartialType(
  OmitType(CreatePipelineDto, ['stages'] as const),
) {}
