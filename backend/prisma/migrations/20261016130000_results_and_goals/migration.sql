-- F5: metas da operação e classificação das mensagens usadas.
CREATE TABLE "prospecting_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "daily_target" INTEGER NOT NULL DEFAULT 5,
  "weekly_target" INTEGER NOT NULL DEFAULT 30,
  "monthly_revenue_goal" DECIMAL(12,2) NOT NULL DEFAULT 300,
  "daily_limit" INTEGER NOT NULL DEFAULT 8,
  "decision_contacts" INTEGER NOT NULL DEFAULT 30,
  "decision_min_replies" INTEGER NOT NULL DEFAULT 2,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "prospecting_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "prospecting_settings" ("id", "updated_at") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "lead_activities"
  ADD COLUMN "template_id" TEXT,
  ADD COLUMN "variation" TEXT;

CREATE INDEX "lead_activities_template_id_idx" ON "lead_activities"("template_id");
