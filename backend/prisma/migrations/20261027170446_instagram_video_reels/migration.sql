-- CreateEnum
CREATE TYPE "InstagramMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "instagram_media" ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "kind" "InstagramMediaKind" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poster_key" TEXT;

