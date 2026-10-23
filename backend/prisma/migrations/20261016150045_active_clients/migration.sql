-- F9: clientes ativos (ficha, relatórios semanais e pagamentos).
-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT NOT NULL DEFAULT 'Gestão de anúncios no Meta',
    "monthly_fee" DECIMAL(12,2) NOT NULL DEFAULT 500,
    "start_date" TIMESTAMP(3) NOT NULL,
    "billing_day" INTEGER NOT NULL,
    "daily_ad_budget" DECIMAL(12,2),
    "partner_access" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_greeting" BOOLEAN NOT NULL DEFAULT false,
    "first_campaign_live" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_reports" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "spend" DECIMAL(12,2) NOT NULL,
    "conversations" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_payments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_lead_id_key" ON "clients"("lead_id");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "client_reports_client_id_week_start_key" ON "client_reports"("client_id", "week_start");

-- CreateIndex
CREATE INDEX "client_payments_client_id_paid_at_idx" ON "client_payments"("client_id", "paid_at");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_reports" ADD CONSTRAINT "client_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Leads que já estavam em "Fechou" ganham a ficha de cliente (mensalidade = valor estimado ou 500).
-- Nascem pausadas: sem pagamento registrado, todas apareceriam como atrasadas na tela Hoje. Quem é
-- cliente de verdade é ativado na ficha.
INSERT INTO "clients" ("id", "lead_id", "status", "monthly_fee", "start_date", "billing_day", "updated_at")
SELECT gen_random_uuid(), l."id", 'PAUSED', COALESCE(l."estimated_value", 500), COALESCE(l."won_at", l."updated_at"),
       LEAST(EXTRACT(DAY FROM COALESCE(l."won_at", l."updated_at"))::int, 28), CURRENT_TIMESTAMP
FROM "leads" l JOIN "stages" s ON s."id" = l."stage_id"
WHERE s."stage_type" = 'WON';
