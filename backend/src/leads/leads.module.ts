import { Module } from '@nestjs/common';
import { StagesModule } from '../stages/stages.module.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

@Module({
  imports: [StagesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
