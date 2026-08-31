import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sendPushToUsers } from "./push";
import { SEASON_ONE_START, WEEK_MS, seasonStartFor, weekStartFor } from "./season";

// Faz 2, Bölüm III: "🏆 rozet + ₺250 prim" for the weekly champion.
export const WEEKLY_CHAMPION_BONUS = 250;

// Salı 09:00 Istanbul — nine hours after the week rolls over at 00:00, so the
// award always looks back at a fully-settled week (the last Monday-night match
// has had time to resolve).
const AWARD_HOUR_MS = 9 * 60 * 60 * 1000;

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

type Standing = { userId: string; net: number; correct: number; total: number };

// Same net-kâr tally as getLeaderboard, scoped to a single range and without
// the full user directory — champion-awarding only cares about who actually
// played, not the whole roster sitting at zero.
async function topNetKarUser(rangeStart: Date, rangeEnd: Date): Promise<Standing | null> {
  const predictions = await prisma.prediction.findMany({
    where: {
      status: { in: ["won", "lost"] },
      gift: { is: null },
      match: { kickoff: { gte: rangeStart, lt: rangeEnd } },
    },
    select: { userId: true, status: true, stake: true, payout: true },
  });

  const tally = new Map<string, Standing>();
  for (const p of predictions) {
    const bucket = tally.get(p.userId) ?? { userId: p.userId, net: 0, correct: 0, total: 0 };
    bucket.total++;
    if (p.status === "won") bucket.correct++;
    bucket.net += (p.payout ?? 0) - p.stake;
    tally.set(p.userId, bucket);
  }

  const ranked = [...tally.values()].sort(
    (a, b) =>
      b.net - a.net ||
      b.correct / b.total - a.correct / a.total ||
      a.total - b.total
  );
  return ranked[0] ?? null;
}

// Called from lib/data.ts's syncMatchState on every relevant request, same
// as applyPeriodicAdjustments — cheap on a no-op tick (one small query, no
// writes) and the WeeklyChampion.weekStart unique constraint is what makes
// it safe to call from several overlapping requests: only the create() that
// actually wins the race gets past the try/catch below.
export async function awardWeeklyChampionIfDue(now: Date = new Date()) {
  if (now.getTime() < SEASON_ONE_START.getTime()) return null;

  const thisWeekStart = weekStartFor(now);
  if (now.getTime() < thisWeekStart.getTime() + AWARD_HOUR_MS) return null;

  const prevWeekStart = new Date(thisWeekStart.getTime() - WEEK_MS);
  // Sezon 1'den önce kapanan (beta) haftalar taçlanmaz — ilk gerçek haftanın
  // birincisi, Sezon 1'in ilk haftası bittiğinde belli olur.
  if (prevWeekStart.getTime() < SEASON_ONE_START.getTime()) return null;

  const winner = await topNetKarUser(prevWeekStart, thisWeekStart);
  if (!winner) return null; // kimse oynamadı — bu hafta şampiyonu yok

  try {
    await prisma.weeklyChampion.create({
      data: { userId: winner.userId, weekStart: prevWeekStart, net: winner.net, bonus: WEEKLY_CHAMPION_BONUS },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return null; // başka bir istek zaten ödüllendirdi
    throw err;
  }

  const [champion] = await Promise.all([
    prisma.user.update({
      where: { id: winner.userId },
      data: { balance: { increment: WEEKLY_CHAMPION_BONUS } },
      select: { displayName: true },
    }),
  ]);

  const allUserIds = await prisma.user.findMany({ select: { id: true } });
  const netLabel = `${winner.net >= 0 ? "+" : "−"}₺${Math.abs(winner.net).toLocaleString("tr-TR")}`;
  await sendPushToUsers(
    allUserIds.map((u) => u.id),
    {
      title: "🏆 Haftanın Birincisi",
      body: `${champion.displayName} bu hafta ${netLabel} net kârla zirvede! ₺${WEEKLY_CHAMPION_BONUS} prim kazandı. Yeni hafta başladı.`,
      data: { type: "weekly_champion" },
    }
  );

  return { userId: winner.userId, net: winner.net };
}

// Same idea, but for the season that just closed — fires at the same
// Salı 09:00 gate, only in the very first week of a new season (i.e.
// the week whose start IS a season start), and only once a prior season
// actually exists to crown.
export async function awardSeasonChampionIfDue(now: Date = new Date()) {
  if (now.getTime() < SEASON_ONE_START.getTime()) return null;

  const thisWeekStart = weekStartFor(now);
  const thisSeasonStart = seasonStartFor(now);
  if (thisWeekStart.getTime() !== thisSeasonStart.getTime()) return null;
  if (now.getTime() < thisSeasonStart.getTime() + AWARD_HOUR_MS) return null;
  if (thisSeasonStart.getTime() <= SEASON_ONE_START.getTime()) return null; // Sezon 1'den önce taçlanacak sezon yok

  const prevSeasonStart = seasonStartFor(new Date(thisSeasonStart.getTime() - 1));
  const winner = await topNetKarUser(prevSeasonStart, thisSeasonStart);
  if (!winner) return null;

  try {
    await prisma.seasonChampion.create({
      data: { userId: winner.userId, seasonStart: prevSeasonStart, net: winner.net },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return null;
    throw err;
  }

  const champion = await prisma.user.findUniqueOrThrow({
    where: { id: winner.userId },
    select: { displayName: true },
  });
  const allUserIds = await prisma.user.findMany({ select: { id: true } });
  const netLabel = `${winner.net >= 0 ? "+" : "−"}₺${Math.abs(winner.net).toLocaleString("tr-TR")}`;
  await sendPushToUsers(
    allUserIds.map((u) => u.id),
    {
      title: "🏆 Sezon Şampiyonu",
      body: `${champion.displayName} sezonu ${netLabel} net kârla zirvede tamamladı! Yeni sezon başladı, herkes ₺1.000 ile sıfırdan.`,
      data: { type: "season_champion" },
    }
  );

  return { userId: winner.userId, net: winner.net };
}
