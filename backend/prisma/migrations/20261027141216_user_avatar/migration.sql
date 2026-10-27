-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" BYTEA,
ADD COLUMN     "avatar_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_avatar_id_key" ON "users"("avatar_id");

