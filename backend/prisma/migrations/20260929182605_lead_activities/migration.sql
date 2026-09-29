-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'STAGE_CHANGED', 'NOTE', 'FOLLOW_UP_SCHEDULED', 'FOLLOW_UP_DONE');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "follow_up_at" TIMESTAMP(3),
ADD COLUMN     "follow_up_note" TEXT;

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "text" TEXT,
    "from_stage" TEXT,
    "to_stage" TEXT,
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_follow_up_at_idx" ON "leads"("follow_up_at");

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
