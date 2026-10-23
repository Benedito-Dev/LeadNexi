-- F4: IA dentro do app (banco de provas, sugestões da IA, resumo e responsável do lead).
-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('MESSAGE', 'REPLY', 'SUMMARY', 'ANALYSIS');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "ai_summary" JSONB,
ADD COLUMN     "ai_summary_at" TIMESTAMP(3),
ADD COLUMN     "responsible_name" TEXT;

-- CreateTable
CREATE TABLE "proofs" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "highlight" TEXT,
    "source" TEXT NOT NULL,
    "reference_date" TEXT,
    "can_name_client" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "chosen_index" INTEGER,
    "feedback" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_suggestions_lead_id_created_at_idx" ON "ai_suggestions"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Banco de provas inicial (spec F4, seção 4.6): conversas iniciadas, não vendas; sem nome da loja
INSERT INTO "proofs" ("id", "text", "highlight", "source", "reference_date", "can_name_client", "updated_at") VALUES
  (gen_random_uuid(), 'Loja de celular em Fortaleza: R$ 2,26 por conversa no WhatsApp na melhor campanha (209 conversas, R$ 472,93 investidos).', 'R$ 2,26 por conversa', 'Gerenciador de Anúncios', 'out/2026', false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Mesma loja de celular em Fortaleza: 1.200 conversas no WhatsApp em 3 campanhas, R$ 4.554,71 investidos, média de R$ 3,80 por conversa.', '1.200 conversas no WhatsApp', 'Gerenciador de Anúncios', 'out/2025–out/2026', false, CURRENT_TIMESTAMP);
