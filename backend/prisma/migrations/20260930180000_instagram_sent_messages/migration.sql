-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'INSTAGRAM_MESSAGE_SENT';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "instagram_last_message_at" TIMESTAMP(3);

-- Leads que já conversaram pelo direct: a última mensagem recebida
UPDATE "leads" SET "instagram_last_message_at" = last."created_at"
FROM (
  SELECT "lead_id", MAX("created_at") AS "created_at"
  FROM "lead_activities"
  WHERE "type" = 'INSTAGRAM_MESSAGE'
  GROUP BY "lead_id"
) AS last
WHERE "leads"."id" = last."lead_id";
