-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'LEAD_UPDATED';

-- AlterTable
ALTER TABLE "lead_activities" ADD COLUMN     "via" TEXT;
