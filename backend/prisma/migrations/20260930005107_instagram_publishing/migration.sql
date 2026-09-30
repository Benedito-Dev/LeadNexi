-- AlterTable
ALTER TABLE "instagram_posts" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ig_media_id" TEXT,
ADD COLUMN     "permalink" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "publishing_started_at" TIMESTAMP(3);
