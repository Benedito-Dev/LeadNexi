-- Automações: botão na mensagem, entrega ao tocar e "siga para receber"
-- AlterTable
ALTER TABLE "instagram_automation_runs" ADD COLUMN     "delivered_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "instagram_automations" ADD COLUMN     "button_label" TEXT,
ADD COLUMN     "delivery_message" TEXT,
ADD COLUMN     "not_following_message" TEXT,
ADD COLUMN     "require_follow" BOOLEAN NOT NULL DEFAULT false;

