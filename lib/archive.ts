import { prisma } from "./prisma";
import { WEEK_MS, weekEndFor, weekStartFor } from "./season";

export type ChampionEntry = {
  displayName: string;
  favoriteTeam: string | null;
  net: number;
};

export type WeeklyChampionEntry = ChampionEntry & { weekStart: string; bonus: number };
export type SeasonChampionEntry = ChampionEntry & { seasonStart: string };

// The global honour roll — every past Salı 09:00 and season-boundary
// award, newest first. Not user-scoped: "geçmiş şampiyonlar" is a shared
// record, the same for everyone looking at it.
export async function getHallOfFame(weeklyLimit = 12, seasonLimit = 6) {
  const [weekly, season] = await Promise.all([
    prisma.weeklyChampion.findMany({
      orderBy: { weekStart: "desc" },
      take: weeklyLimit,
      include: { user: { select: { displayName: true, favoriteTeam: true } } },
    }),
    prisma.seasonChampion.findMany({
      orderBy: { seasonStart: "desc" },
      take: seasonLimit,
      include: { user: { select: { displayName: true, favoriteTeam: true } } },
    }),
  ]);

  return {
    weekly: weekly.map(
      (w): WeeklyChampionEntry => ({
        weekStart: w.weekStart.toISOString(),
        displayName: w.user.displayName,
        favoriteTeam: w.user.favoriteTeam,
        net: w.net,
        bonus: w.bonus,
      })
    ),
    season: season.map(
      (s): SeasonChampionEntry => ({
        seasonStart: s.seasonStart.toISOString(),
        displayName: s.user.displayName,
        favoriteTeam: s.user.favoriteTeam,
        net: s.net,
      })
    ),
  };
}

export type FormPoint = { weekStart: string; net: number };

// "Kişisel form grafiği" — net kâr per week for the most recent `weeks`
// weeks (oldest first, including the current still-open one), so a chart
// can just map straight across left to right.
export async function getPersonalForm(
  userId: string,
  weeks = 8,
  now: Date = new Date()
): Promise<FormPoint[]> {
  const currentWeekStart = weekStartFor(now);
  const rangeStart = new Date(currentWeekStart.getTime() - (weeks - 1) * WEEK_MS);
  const rangeEnd = weekEndFor(now);

  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      status: { in: ["won", "lost"] },
      gift: { is: null },
      match: { kickoff: { gte: rangeStart, lt: rangeEnd } },
    },
    select: { stake: true, payout: true, match: { select: { kickoff: true } } },
  });

  const netByWeek = new Map<number, number>();
  for (const p of predictions) {
    const key = weekStartFor(p.match.kickoff).getTime();
    netByWeek.set(key, (netByWeek.get(key) ?? 0) + (p.payout ?? 0) - p.stake);
  }

  const points: FormPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(currentWeekStart.getTime() - i * WEEK_MS);
    points.push({ weekStart: ws.toISOString(), net: netByWeek.get(ws.getTime()) ?? 0 });
  }
  return points;
}

// Shown on the profile as the "ünvan alanı" — how many times this user has
// topped a week or a season.
export async function getMyChampionCounts(userId: string) {
  const [weeklyCount, seasonCount] = await Promise.all([
    prisma.weeklyChampion.count({ where: { userId } }),
    prisma.seasonChampion.count({ where: { userId } }),
  ]);
  return { weeklyCount, seasonCount };
}
