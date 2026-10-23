import { Module } from '@nestjs/common';
import { LeadListsModule } from '../lead-lists/lead-lists.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramDirectController } from './instagram-direct.controller.js';
import { InstagramHashtagsService } from './instagram-hashtags.service.js';
import { InstagramInboxService } from './instagram-inbox.service.js';
import { InstagramMessagesController } from './instagram-messages.controller.js';
import { InstagramMessagesService } from './instagram-messages.service.js';
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
  imports: [LeadListsModule, StorageModule],
  controllers: [
    InstagramController,
    InstagramPostsController,
    InstagramCronController,
    InstagramWebhookController,
    InstagramMessagesController,
    InstagramDirectController,
  ],
  providers: [
    InstagramService,
    InstagramSettingsService,
    InstagramPostsService,
    InstagramPublisherService,
    InstagramSyncService,
    PublishAlarmService,
    InstagramInboxService,
    InstagramMessagesService,
    InstagramApiClient,
    InstagramHashtagsService,
  ],
})
export class InstagramModule {}
