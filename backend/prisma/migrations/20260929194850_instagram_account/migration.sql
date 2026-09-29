-- CreateTable
CREATE TABLE "instagram_accounts" (
    "id" TEXT NOT NULL,
    "ig_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "profile_picture_url" TEXT,
    "access_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_accounts_ig_user_id_key" ON "instagram_accounts"("ig_user_id");
