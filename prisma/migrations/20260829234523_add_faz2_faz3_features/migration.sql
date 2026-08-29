-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "isBanko" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wasInsured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WeeklyChampion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "net" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyChampion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonChampion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonStart" TIMESTAMP(3) NOT NULL,
    "net" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonChampion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonPerk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonStart" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3),
    "predictionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonPerk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChampion_weekStart_key" ON "WeeklyChampion"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklyChampion_userId_idx" ON "WeeklyChampion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonChampion_seasonStart_key" ON "SeasonChampion"("seasonStart");

-- CreateIndex
CREATE INDEX "SeasonChampion_userId_idx" ON "SeasonChampion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPerk_predictionId_key" ON "SeasonPerk"("predictionId");

-- CreateIndex
CREATE INDEX "SeasonPerk_userId_idx" ON "SeasonPerk"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPerk_userId_seasonStart_kind_key" ON "SeasonPerk"("userId", "seasonStart", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE INDEX "LeagueMembership_userId_idx" ON "LeagueMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_leagueId_userId_key" ON "LeagueMembership"("leagueId", "userId");

-- AddForeignKey
ALTER TABLE "WeeklyChampion" ADD CONSTRAINT "WeeklyChampion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonChampion" ADD CONSTRAINT "SeasonChampion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonPerk" ADD CONSTRAINT "SeasonPerk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
