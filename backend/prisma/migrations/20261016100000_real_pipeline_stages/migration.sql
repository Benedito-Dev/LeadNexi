CREATE TYPE "StageType" AS ENUM ('CONTACT', 'SENT', 'RESPONDED', 'MEETING', 'PROPOSAL', 'WON', 'LOST', 'CUSTOM');

ALTER TABLE "stages" ADD COLUMN "stage_type" "StageType" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "leads" ADD COLUMN "meeting_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "lost_reason" TEXT;
ALTER TABLE "leads" ADD COLUMN "won_at" TIMESTAMP(3);

UPDATE "stages" SET "name" = 'A contatar', "stage_type" = 'CONTACT' WHERE lower("name") = 'novo';
UPDATE "stages" SET "name" = 'Mensagem enviada', "stage_type" = 'SENT' WHERE lower("name") = 'contato';
UPDATE "stages" SET "name" = 'Proposta enviada', "stage_type" = 'PROPOSAL' WHERE lower("name") = 'proposta';
UPDATE "stages" SET "name" = 'Fechou', "stage_type" = 'WON' WHERE lower("name") IN ('fechado', 'ganho');
UPDATE "stages" SET "stage_type" = 'CONTACT' WHERE lower("name") = 'a contatar';
UPDATE "stages" SET "stage_type" = 'SENT' WHERE lower("name") = 'mensagem enviada';
UPDATE "stages" SET "stage_type" = 'RESPONDED' WHERE lower("name") = 'respondeu';
UPDATE "stages" SET "stage_type" = 'MEETING' WHERE lower("name") IN ('reunião marcada', 'reuniao marcada');
UPDATE "stages" SET "stage_type" = 'PROPOSAL' WHERE lower("name") = 'proposta enviada';
UPDATE "stages" SET "stage_type" = 'WON' WHERE lower("name") = 'fechou';
UPDATE "stages" SET "stage_type" = 'LOST' WHERE lower("name") = 'perdido';

UPDATE "leads" l
SET "won_at" = l."updated_at"
FROM "stages" s
WHERE l."stage_id" = s."id" AND s."stage_type" = 'WON' AND l."won_at" IS NULL;

INSERT INTO "stages" ("id", "name", "stage_type", "position", "pipeline_id", "created_at", "updated_at")
SELECT md5(p."id" || ':responded')::uuid::text, 'Respondeu', 'RESPONDED', 0, p."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "pipelines" p
WHERE NOT EXISTS (SELECT 1 FROM "stages" s WHERE s."pipeline_id" = p."id" AND s."stage_type" = 'RESPONDED');

INSERT INTO "stages" ("id", "name", "stage_type", "position", "pipeline_id", "created_at", "updated_at")
SELECT md5(p."id" || ':meeting')::uuid::text, 'Reunião marcada', 'MEETING', 0, p."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "pipelines" p
WHERE NOT EXISTS (SELECT 1 FROM "stages" s WHERE s."pipeline_id" = p."id" AND s."stage_type" = 'MEETING');

INSERT INTO "stages" ("id", "name", "stage_type", "position", "pipeline_id", "created_at", "updated_at")
SELECT md5(p."id" || ':lost')::uuid::text, 'Perdido', 'LOST', 0, p."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "pipelines" p
WHERE NOT EXISTS (SELECT 1 FROM "stages" s WHERE s."pipeline_id" = p."id" AND s."stage_type" = 'LOST');

WITH ranked AS (
  SELECT
    s."id",
    row_number() OVER (
      PARTITION BY s."pipeline_id"
      ORDER BY CASE s."stage_type"
        WHEN 'CONTACT' THEN 0
        WHEN 'SENT' THEN 1
        WHEN 'RESPONDED' THEN 2
        WHEN 'MEETING' THEN 3
        WHEN 'PROPOSAL' THEN 4
        WHEN 'WON' THEN 5
        WHEN 'LOST' THEN 6
        ELSE 100 + s."position"
      END, s."position", s."id"
    ) - 1 AS "position"
  FROM "stages" s
)
UPDATE "stages" s
SET "position" = ranked."position"
FROM ranked
WHERE s."id" = ranked."id";

CREATE INDEX "leads_meeting_at_idx" ON "leads"("meeting_at");
CREATE INDEX "leads_won_at_idx" ON "leads"("won_at");
