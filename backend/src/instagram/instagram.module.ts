import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramPostsController } from './instagram-posts.controller.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import { InstagramController } from './instagram.controller.js';
import { InstagramService } from './instagram.service.js';
import { PublishAlarmService } from './publish-alarm.service.js';

@Module({
  imports: [StorageModule],
  controllers: [
    InstagramController,
    InstagramPostsController,
    InstagramCronController,
  ],
  providers: [
    InstagramService,
    InstagramSettingsService,
    InstagramPostsService,
    InstagramPublisherService,
    PublishAlarmService,
    InstagramApiClient,
  ],
})
export class InstagramModule {}
