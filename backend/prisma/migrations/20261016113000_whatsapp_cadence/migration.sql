-- F2: histórico explícito de contatos pelo WhatsApp e seus passos de cadência.
ALTER TYPE "LeadActivityType" ADD VALUE 'WHATSAPP_MESSAGE_SENT';
ALTER TYPE "LeadActivityType" ADD VALUE 'WHATSAPP_MESSAGE_RECEIVED';

ALTER TABLE "lead_activities"
  ADD COLUMN "channel" TEXT,
  ADD COLUMN "cadence_step" INTEGER;

CREATE INDEX "lead_activities_channel_idx" ON "lead_activities"("channel");

-- A última etapa automática da cadência é distinta de uma perda comercial.
-- Ela usa LOST para continuar fora dos indicadores ativos e poder ser arquivada.
INSERT INTO "stages" ("id", "name", "color", "stage_type", "position", "pipeline_id", "created_at", "updated_at")
SELECT
  md5(p."id"::text || ':sem-resposta')::uuid,
  'Sem resposta',
  '#64748B',
  'LOST'::"StageType",
  COALESCE(MAX(s."position") + 1, 0),
  p."id",
  NOW(),
  NOW()
FROM "pipelines" p
LEFT JOIN "stages" s ON s."pipeline_id" = p."id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "stages" existing
  WHERE existing."pipeline_id" = p."id"
    AND existing."name" = 'Sem resposta'
)
GROUP BY p."id";
