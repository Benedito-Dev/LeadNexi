-- Automações: resposta e menção no story e palavra no direct
-- CreateEnum
CREATE TYPE "InstagramAutomationTrigger" AS ENUM ('COMMENT', 'STORY_REPLY', 'STORY_MENTION', 'DM_KEYWORD');

-- AlterTable
ALTER TABLE "instagram_automation_runs" ALTER COLUMN "media_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "instagram_automations" ADD COLUMN     "trigger" "InstagramAutomationTrigger" NOT NULL DEFAULT 'COMMENT';

