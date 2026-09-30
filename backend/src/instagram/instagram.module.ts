import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramInboxService } from './instagram-inbox.service.js';
import { InstagramPostsController } from './instagram-posts.controller.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import { InstagramSyncService } from './instagram-sync.service.js';
import { InstagramWebhookController } from './instagram-webhook.controller.js';
import { InstagramController } from './instagram.controller.js';
import { InstagramService } from './instagram.service.js';
import { PublishAlarmService } from './publish-alarm.service.js';

@Module({
  imports: [StorageModule],
  controllers: [
    InstagramController,
    InstagramPostsController,
    InstagramCronController,
    InstagramWebhookController,
  ],
  providers: [
    InstagramService,
    InstagramSettingsService,
    InstagramPostsService,
    InstagramPublisherService,
    InstagramSyncService,
    PublishAlarmService,
    InstagramInboxService,
    InstagramApiClient,
  ],
})
export class InstagramModule {}
