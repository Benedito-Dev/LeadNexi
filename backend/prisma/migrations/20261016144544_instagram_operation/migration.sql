-- F8: post do Instagram como prova no follow-up e grupos de hashtags salvos.
-- AlterTable
ALTER TABLE "instagram_posts" ADD COLUMN     "is_proof" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proof_note" TEXT;

-- CreateTable
CREATE TABLE "instagram_hashtag_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_hashtag_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instagram_posts_is_proof_idx" ON "instagram_posts"("is_proof");
