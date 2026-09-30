-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'INSTAGRAM_MESSAGE';

-- AlterTable
ALTER TABLE "instagram_accounts" ADD COLUMN     "messages_enabled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lead_activities" ADD COLUMN     "external_id" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "instagram_user_id" TEXT,
ADD COLUMN     "instagram_username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lead_activities_external_id_key" ON "lead_activities"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_instagram_user_id_key" ON "leads"("instagram_user_id");

