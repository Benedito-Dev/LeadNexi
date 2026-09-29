import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { InstagramApiClient } from './instagram-api.client.js';
import { InstagramCronController } from './instagram-cron.controller.js';
import { InstagramPostsController } from './instagram-posts.controller.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramController } from './instagram.controller.js';
import { InstagramService } from './instagram.service.js';

@Module({
  imports: [StorageModule],
  controllers: [
    InstagramController,
    InstagramPostsController,
    InstagramCronController,
  ],
  providers: [InstagramService, InstagramPostsService, InstagramApiClient],
})
export class InstagramModule {}
