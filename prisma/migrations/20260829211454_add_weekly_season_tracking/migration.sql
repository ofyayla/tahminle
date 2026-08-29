-- AlterTable
ALTER TABLE "User" ADD COLUMN     "seasonAnchor" TIMESTAMP(3),
ADD COLUMN     "weekAnchor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Match_kickoff_idx" ON "Match"("kickoff");
