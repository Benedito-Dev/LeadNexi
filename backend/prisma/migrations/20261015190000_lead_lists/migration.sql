CREATE TABLE "lead_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT,
    "city" TEXT,
    "target_contacts" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_lists_pkey" PRIMARY KEY ("id")
);

INSERT INTO "lead_lists" ("id", "name", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000001', 'Sem lista', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "lead_lists" ("id", "name", "niche", "archived", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000002', 'Pet shops (arquivado)', 'Pet shops', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "leads" ADD COLUMN "list_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "phone_type" TEXT;
ALTER TABLE "leads" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "leads" ADD COLUMN "address" TEXT;
ALTER TABLE "leads" ADD COLUMN "maps_url" TEXT;
ALTER TABLE "leads" ADD COLUMN "google_place_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "google_rating" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "google_review_count" INTEGER;
ALTER TABLE "leads" ADD COLUMN "is_network" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "ad_status" TEXT;
ALTER TABLE "leads" ADD COLUMN "cadence_step" INTEGER;

UPDATE "leads"
SET "list_id" = '00000000-0000-4000-8000-000000000002', "archived" = true
WHERE "list_id" IS NULL;

ALTER TABLE "leads" ALTER COLUMN "list_id" SET NOT NULL;

CREATE INDEX "lead_lists_archived_created_at_idx" ON "lead_lists"("archived", "created_at");
CREATE INDEX "leads_list_id_idx" ON "leads"("list_id");
CREATE INDEX "leads_archived_idx" ON "leads"("archived");

ALTER TABLE "leads" ADD CONSTRAINT "leads_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lead_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
