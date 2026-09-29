-- CreateEnum
CREATE TYPE "InstagramPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "instagram_posts" (
    "id" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "InstagramPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_media" (
    "id" TEXT NOT NULL,
    "post_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "storage_key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instagram_posts_status_scheduled_at_idx" ON "instagram_posts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_media_storage_key_key" ON "instagram_media"("storage_key");

-- CreateIndex
CREATE INDEX "instagram_media_post_id_idx" ON "instagram_media"("post_id");

-- AddForeignKey
ALTER TABLE "instagram_media" ADD CONSTRAINT "instagram_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "instagram_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
