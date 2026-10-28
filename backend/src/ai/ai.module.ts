import { Module } from '@nestjs/common';
import { AiModelService } from './ai-model.service.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService, AiModelService],
})
export class AiModule {}
