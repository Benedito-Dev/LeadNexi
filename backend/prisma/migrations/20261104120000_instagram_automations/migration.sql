-- Automações do Instagram: comentário num post vira mensagem no direct
-- CreateEnum
CREATE TYPE "InstagramAutomationRunStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "instagram_accounts" ADD COLUMN     "comments_enabled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "instagram_automations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "message" TEXT NOT NULL,
    "public_replies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_automation_runs" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "commenter_id" TEXT NOT NULL,
    "username" TEXT,
    "comment_text" TEXT NOT NULL,
    "lead_id" TEXT,
    "status" "InstagramAutomationRunStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_automation_runs_comment_id_key" ON "instagram_automation_runs"("comment_id");

-- CreateIndex
CREATE INDEX "instagram_automation_runs_automation_id_created_at_idx" ON "instagram_automation_runs"("automation_id", "created_at");

-- CreateIndex
CREATE INDEX "instagram_automation_runs_automation_id_commenter_id_media__idx" ON "instagram_automation_runs"("automation_id", "commenter_id", "media_id");

-- AddForeignKey
ALTER TABLE "instagram_automation_runs" ADD CONSTRAINT "instagram_automation_runs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "instagram_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
