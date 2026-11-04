import { Module } from '@nestjs/common';
import { LeadListsModule } from '../lead-lists/lead-lists.module.js';
import { LeadsModule } from '../leads/leads.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramAutomationsController } from './instagram-automations.controller.js';
import { InstagramAutomationsService } from './instagram-automations.service.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramDirectController } from './instagram-direct.controller.js';
import { InstagramHashtagsService } from './instagram-hashtags.service.js';
import { InstagramInboxService } from './instagram-inbox.service.js';
import { InstagramInsightsService } from './instagram-insights.service.js';
import { InstagramLeadsService } from './instagram-leads.service.js';
import { InstagramPostPerformanceService } from './instagram-post-performance.service.js';
import { InstagramMessagesController } from './instagram-messages.controller.js';
import { InstagramMessagesService } from './instagram-messages.service.js';
import { InstagramPostsController } from './instagram-posts.controller.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramDirectUploadService } from './instagram-direct-upload.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import { InstagramSyncService } from './instagram-sync.service.js';
import { InstagramWebhookController } from './instagram-webhook.controller.js';
import { InstagramController } from './instagram.controller.js';
import { InstagramService } from './instagram.service.js';
import { PublishAlarmService } from './publish-alarm.service.js';

@Module({
  imports: [LeadListsModule, LeadsModule, StorageModule],
  controllers: [
    InstagramController,
    InstagramPostsController,
    InstagramCronController,
    InstagramWebhookController,
    InstagramMessagesController,
    InstagramDirectController,
    InstagramAutomationsController,
  ],
  providers: [
    InstagramService,
    InstagramSettingsService,
    InstagramPostsService,
    InstagramDirectUploadService,
    InstagramPublisherService,
    InstagramSyncService,
    PublishAlarmService,
    InstagramInboxService,
    InstagramMessagesService,
    InstagramApiClient,
    InstagramHashtagsService,
    InstagramInsightsService,
    InstagramPostPerformanceService,
    InstagramLeadsService,
    InstagramAutomationsService,
  ],
  // O servidor MCP (o Claude e os agentes da VPS) usa os mesmos serviços das telas
  exports: [InstagramPostsService, InstagramPublisherService, InstagramDirectUploadService, InstagramPostPerformanceService, InstagramAutomationsService],
})
export class InstagramModule {}
