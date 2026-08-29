import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { WEEKLY_BUDGET, seasonStartFor, weekStartFor } from "./season";

// Faz 3, "Çifte Kasa": doubles one chosen week's kasa for the season.
export const DOUBLE_KASA_MULTIPLIER = 2;

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export type PerkResult = { ok: true } | { ok: false; error: string };

// Once per season — the SeasonPerk(userId, seasonStart, kind) unique
// constraint is the actual enforcement; this just turns a P2002 into a
// friendly message instead of a 500.
export async function activateDoubleKasa(userId: string, now: Date = new Date()): Promise<PerkResult> {
  try {
    await prisma.seasonPerk.create({
      data: { userId, seasonStart: seasonStartFor(now), kind: "double_kasa", weekStart: weekStartFor(now) },
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: "Bu sezon Çifte Kasa jokerini zaten kullandın." };
    }
    throw err;
  }
}

export async function activateInsurance(
  userId: string,
  predictionId: string,
  now: Date = new Date()
): Promise<PerkResult> {
  const prediction = await prisma.prediction.findFirst({
    where: { id: predictionId, userId, status: "open", gift: { is: null } },
    select: { match: { select: { status: true } } },
  });
  if (!prediction) {
    return { ok: false, error: "Bu tahmin bulunamadı veya sigortalanamaz." };
  }
  if (prediction.match.status !== "upcoming") {
    return { ok: false, error: "Bu maç başladı, artık sigortalanamaz." };
  }

  try {
    await prisma.seasonPerk.create({
      data: { userId, seasonStart: seasonStartFor(now), kind: "insurance", predictionId },
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: "Bu sezon Sigorta jokerini zaten kullandın." };
    }
    throw err;
  }
}

// The weekly kasa cap for one specific week — doubled if the user spent
// their Çifte Kasa joker on exactly that week. `weekStart` alone identifies
// the activation row unambiguously, no season lookup needed here.
export async function weeklyBudgetCapFor(userId: string, weekStart: Date): Promise<number> {
  const boosted = await prisma.seasonPerk.findFirst({
    where: { userId, kind: "double_kasa", weekStart },
    select: { id: true },
  });
  return boosted ? WEEKLY_BUDGET * DOUBLE_KASA_MULTIPLIER : WEEKLY_BUDGET;
}

// Batch version for a set of distinct week starts — used by getMatchBudgets,
// which juggles several matches (and therefore possibly several weeks) at
// once instead of a single "now"-relative week.
export async function boostedWeekStarts(userId: string, weekStarts: Date[]): Promise<Set<number>> {
  if (weekStarts.length === 0) return new Set();
  const rows = await prisma.seasonPerk.findMany({
    where: { userId, kind: "double_kasa", weekStart: { in: weekStarts } },
    select: { weekStart: true },
  });
  return new Set(rows.map((r) => r.weekStart!.getTime()));
}

export type UserPerkStatus = {
  doubleKasa: { available: boolean; usedForWeekStart: string | null };
  insurance: { available: boolean; usedForPredictionId: string | null };
};

// Drives the joker panel — what's left to use this season, and what was
// already spent on.
export async function getUserPerkStatus(userId: string, now: Date = new Date()): Promise<UserPerkStatus> {
  const perks = await prisma.seasonPerk.findMany({
    where: { userId, seasonStart: seasonStartFor(now) },
    select: { kind: true, weekStart: true, predictionId: true },
  });
  const doubleKasa = perks.find((p) => p.kind === "double_kasa");
  const insurance = perks.find((p) => p.kind === "insurance");
  return {
    doubleKasa: { available: !doubleKasa, usedForWeekStart: doubleKasa?.weekStart?.toISOString() ?? null },
    insurance: { available: !insurance, usedForPredictionId: insurance?.predictionId ?? null },
  };
}
