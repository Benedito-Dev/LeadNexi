import { Module } from '@nestjs/common';
import { AiModelService } from './ai-model.service.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ProofsController } from './proofs.controller.js';
import { ProofsService } from './proofs.service.js';

@Module({
  controllers: [AiController, ProofsController],
  providers: [AiService, AiModelService, ProofsService],
})
export class AiModule {}
