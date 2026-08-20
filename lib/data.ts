import { prisma } from "./prisma";
import { ensureFreshMatches } from "./scraper";
import { settleDueMatches, refreshMatchStatuses } from "./settlement";

export async function syncMatchState() {
  try {
    await ensureFreshMatches();
  } catch (err) {
    console.error(err);
  }
  await Promise.all([refreshMatchStatuses(), settleDueMatches()]);
}

export async function getUpcomingMatches() {
  await syncMatchState();
  return prisma.match.findMany({
    where: { status: { in: ["upcoming", "live"] } },
    orderBy: { kickoff: "asc" },
  });
}

export async function getMatchById(id: string) {
  return prisma.match.findUnique({ where: { id } });
}

export async function getWalletSummary(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [user, openPredictions, settledThisWeek] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.prediction.findMany({ where: { userId, status: "open" } }),
    prisma.prediction.findMany({
      where: { userId, status: { in: ["won", "lost"] }, settledAt: { gte: weekAgo } },
    }),
  ]);

  const lockedInOpen = openPredictions.reduce((sum, p) => sum + p.stake, 0);
  const potentialReturn = openPredictions.reduce(
    (sum, p) => sum + Math.round(p.stake * p.oddsAtPick),
    0
  );
  const weekChange = settledThisWeek.reduce((sum, p) => {
    if (p.status === "won") return sum + (p.payout ?? 0) - p.stake;
    return sum - p.stake;
  }, 0);

  return {
    available: user.balance,
    lockedInOpen,
    total: user.balance + lockedInOpen,
    potentialReturn,
    openCount: openPredictions.length,
    weekChange,
    totalNet: user.balance + lockedInOpen - user.startBalance,
  };
}

export async function getPredictions(userId: string, status: "open" | "settled") {
  if (status === "open") {
    return prisma.prediction.findMany({
      where: { userId, status: "open" },
      include: { match: true },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.prediction.findMany({
    where: { userId, status: { in: ["won", "lost"] } },
    include: { match: true },
    orderBy: { settledAt: "desc" },
  });
}

export async function getPerformanceStats(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const predictions = await prisma.prediction.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
  });
  const settled = predictions.filter((p) => p.status !== "open");
  const won = predictions.filter((p) => p.status === "won");
  const netEffect = settled.reduce((sum, p) => {
    if (p.status === "won") return sum + (p.payout ?? 0) - p.stake;
    return sum - p.stake;
  }, 0);

  return {
    total: predictions.length,
    correct: won.length,
    netEffect,
  };
}

export type ActivityItem = {
  id: string;
  kind: "system" | "lock" | "win" | "loss";
  title: string;
  subtitle: string;
  amount: number;
  at: Date;
};

export async function getRecentActivity(userId: string, limit = 6): Promise<ActivityItem[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const items: ActivityItem[] = [];

  for (const p of predictions) {
    const label = `${p.match.homeTeam} – ${p.match.awayTeam}`;
    items.push({
      id: `${p.id}-lock`,
      kind: "lock",
      title: `${label} için tahmin ayrıldı`,
      subtitle: "Açık tahmin",
      amount: -p.stake,
      at: p.createdAt,
    });

    if (p.status !== "open" && p.settledAt) {
      items.push({
        id: `${p.id}-settle`,
        kind: p.status === "won" ? "win" : "loss",
        title: `${label} sonucu işlendi`,
        subtitle: "Maç sonucu",
        amount: p.status === "won" ? (p.payout ?? 0) : -p.stake,
        at: p.settledAt,
      });
    }
  }

  items.push({
    id: "system-start",
    kind: "system",
    title: "Başlangıç sanal bakiyesi",
    subtitle: "Sistem olayı",
    amount: user.startBalance,
    at: user.createdAt,
  });

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}

export type CommunityPulse = {
  total: number;
  home: number;
  draw: number;
  away: number;
};

export async function getCommunityPulse(matchIds: string[]): Promise<Record<string, CommunityPulse>> {
  if (matchIds.length === 0) return {};

  const groups = await prisma.prediction.groupBy({
    by: ["matchId", "choice"],
    where: { matchId: { in: matchIds }, market: "1X2" },
    _count: { _all: true },
  });

  const result: Record<string, CommunityPulse> = {};
  for (const id of matchIds) result[id] = { total: 0, home: 0, draw: 0, away: 0 };

  for (const g of groups) {
    const bucket = result[g.matchId];
    if (!bucket) continue;
    bucket.total += g._count._all;
    if (g.choice === "1") bucket.home += g._count._all;
    else if (g.choice === "X") bucket.draw += g._count._all;
    else if (g.choice === "2") bucket.away += g._count._all;
  }

  return result;
}

export type CommunityFeedItem = {
  id: string;
  displayName: string;
  favoriteTeam: string | null;
  market: "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA";
  choice: string;
  homeTeam: string;
  awayTeam: string;
  isYou: boolean;
  at: Date;
};

export async function getCommunityFeed(currentUserId: string, limit = 15): Promise<CommunityFeedItem[]> {
  const predictions = await prisma.prediction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      match: { select: { homeTeam: true, awayTeam: true } },
      user: { select: { displayName: true, favoriteTeam: true } },
    },
  });

  return predictions.map((p) => ({
    id: p.id,
    displayName: p.user.displayName,
    favoriteTeam: p.user.favoriteTeam,
    market: p.market as "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA",
    choice: p.choice,
    homeTeam: p.match.homeTeam,
    awayTeam: p.match.awayTeam,
    isYou: p.userId === currentUserId,
    at: p.createdAt,
  }));
}

export async function getLeaderboard(currentUserId: string) {
  const users = await prisma.user.findMany({
    orderBy: { balance: "desc" },
    select: { id: true, displayName: true, favoriteTeam: true, balance: true },
  });

  const ranked = users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    displayName: u.displayName,
    favoriteTeam: u.favoriteTeam,
    balance: u.balance,
    isYou: u.id === currentUserId,
  }));

  const you = ranked.find((r) => r.isYou) ?? null;

  return { ranked, you, totalPlayers: ranked.length };
}
