-- CreateEnum
CREATE TYPE "FitFeedback" AS ENUM ('RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "fitFeedback" "FitFeedback";

-- CreateIndex
CREATE INDEX "reviews_productId_fitFeedback_idx" ON "reviews"("productId", "fitFeedback");
