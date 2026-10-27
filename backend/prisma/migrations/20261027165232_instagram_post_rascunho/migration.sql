-- AlterEnum
ALTER TYPE "InstagramPostStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "instagram_posts" ALTER COLUMN "scheduled_at" DROP NOT NULL;

