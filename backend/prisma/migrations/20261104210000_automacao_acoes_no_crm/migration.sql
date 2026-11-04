-- Automações: levar o lead para uma etapa e uma lista
-- AlterTable
ALTER TABLE "instagram_automations" ADD COLUMN     "list_id" TEXT,
ADD COLUMN     "stage_id" TEXT;

-- AddForeignKey
ALTER TABLE "instagram_automations" ADD CONSTRAINT "instagram_automations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automations" ADD CONSTRAINT "instagram_automations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lead_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

