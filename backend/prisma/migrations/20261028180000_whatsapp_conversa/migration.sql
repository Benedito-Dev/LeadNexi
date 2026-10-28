-- Conversa do lead no WhatsApp (API não oficial)
ALTER TABLE "leads" ADD COLUMN "whatsapp_jid" TEXT,
ADD COLUMN "whatsapp_last_message_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "leads_whatsapp_jid_key" ON "leads"("whatsapp_jid");
