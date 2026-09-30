import { Module } from '@nestjs/common';
import { StagesModule } from '../stages/stages.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { LeadActivitiesController } from './lead-activities.controller.js';
import { LeadActivitiesService } from './lead-activities.service.js';
import { LeadAvatarsController } from './lead-avatars.controller.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

@Module({
  imports: [StagesModule, StorageModule],
  controllers: [
    LeadsController,
    LeadActivitiesController,
    LeadAvatarsController,
  ],
  providers: [LeadsService, LeadActivitiesService],
})
export class LeadsModule {}
