-- Reações do direct: a da conta e a do lead em cada mensagem
ALTER TABLE "lead_activities" ADD COLUMN "reaction" TEXT,
ADD COLUMN "lead_reaction" TEXT;
