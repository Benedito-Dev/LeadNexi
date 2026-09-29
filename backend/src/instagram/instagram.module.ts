import { Module } from '@nestjs/common';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramController } from './instagram.controller.js';
import { InstagramService } from './instagram.service.js';

@Module({
  controllers: [InstagramController, InstagramCronController],
  providers: [InstagramService, InstagramApiClient],
})
export class InstagramModule {}
