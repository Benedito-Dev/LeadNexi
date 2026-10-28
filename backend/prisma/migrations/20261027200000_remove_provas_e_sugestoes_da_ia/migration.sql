-- Sai o que não tem tela nem uso: o banco de provas (tabela e "post como exemplo") e o histórico
-- das sugestões da IA (gravado e nunca lido)
DROP TABLE "proofs";
DROP INDEX IF EXISTS "instagram_posts_is_proof_idx";
ALTER TABLE "instagram_posts" DROP COLUMN "is_proof",
DROP COLUMN "proof_note";
DROP TABLE "ai_suggestions";
DROP TYPE "AiFeature";
