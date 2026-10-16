import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLeadListDto } from './create-lead-list.dto.js';

export class UpdateLeadListDto extends PartialType(CreateLeadListDto) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
