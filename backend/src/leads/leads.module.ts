import { Module } from '@nestjs/common';
import { StagesModule } from '../stages/stages.module.js';
import { LeadActivitiesController } from './lead-activities.controller.js';
import { LeadActivitiesService } from './lead-activities.service.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

@Module({
  imports: [StagesModule],
  controllers: [LeadsController, LeadActivitiesController],
  providers: [LeadsService, LeadActivitiesService],
})
export class LeadsModule {}
