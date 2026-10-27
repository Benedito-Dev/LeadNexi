import { Module } from '@nestjs/common';
import { ResultsModule } from '../results/results.module.js';
import { LeadListsController } from './lead-lists.controller.js';
import { LeadListsService } from './lead-lists.service.js';

@Module({
  imports: [ResultsModule],
  controllers: [LeadListsController],
  providers: [LeadListsService],
  exports: [LeadListsService],
})
export class LeadListsModule {}
