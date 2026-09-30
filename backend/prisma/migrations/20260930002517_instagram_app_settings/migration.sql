-- CreateTable
CREATE TABLE "instagram_app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "app_id" TEXT NOT NULL,
    "app_secret" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_app_settings_pkey" PRIMARY KEY ("id")
);
