-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "resultBtts" BOOLEAN,
ADD COLUMN     "resultOver25" BOOLEAN;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "market" TEXT NOT NULL DEFAULT '1X2';
