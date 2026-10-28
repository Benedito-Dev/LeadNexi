import { Module } from '@nestjs/common';
import { LeadListsModule } from '../lead-lists/lead-lists.module.js';
import { EvolutionClient } from './evolution.client.js';
import { WhatsAppInboxService } from './whatsapp-inbox.service.js';
import { WhatsAppMessagesService } from './whatsapp-messages.service.js';
import { WhatsAppConversationController, WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppService } from './whatsapp.service.js';

/** WhatsApp não oficial (Evolution API): conexão por QR code e as conversas em Conversas. */
@Module({
  imports: [LeadListsModule],
  controllers: [WhatsAppController, WhatsAppConversationController],
  providers: [EvolutionClient, WhatsAppService, WhatsAppInboxService, WhatsAppMessagesService],
})
export class WhatsAppModule {}
