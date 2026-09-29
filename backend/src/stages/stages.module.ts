import { Module } from '@nestjs/common';
import { PipelinesModule } from '../pipelines/pipelines.module.js';
import { StagesController } from './stages.controller.js';
import { StagesService } from './stages.service.js';

@Module({
  imports: [PipelinesModule],
  controllers: [StagesController],
  providers: [StagesService],
  exports: [StagesService],
})
export class StagesModule {}
