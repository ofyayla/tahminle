import { prisma } from "./prisma";
import { ensureFreshMatches } from "./scraper";
import { settleDueMatches, refreshMatchStatuses } from "./settlement";
import {
  applyPeriodicAdjustments,
  PER_MATCH_CAP,
  WEEKLY_BUDGET,
  seasonEndFor,
  seasonStartFor,
  weekEndFor,
  weekStartFor,
} from "./season";
import { awardSeasonChampionIfDue, awardWeeklyChampionIfDue } from "./weeklyChampion";
import { DOUBLE_KASA_MULTIPLIER, boostedWeekStarts, weeklyBudgetCapFor } from "./perks";

export async function syncMatchState() {
  try {
    await ensureFreshMatches();
  } catch (err) {
    console.error(err);
  }
  await Promise.all([refreshMatchStatuses(), settleDueMatches()]);

  // Cheap and idempotent (bounded WHERE-conditioned updateMany calls that
  // affect zero rows outside the week/season boundary tick) — running it on
  // every relevant page load, not just the external cron, means the
  // Pazartesi desteği and season reset land the moment someone opens the
  // app after the boundary, not up to ~60s later.
  await applyPeriodicAdjustments().catch((err) =>
    console.error("Haftalık/sezonluk bakiye güncellemesi başarısız:", err)
  );

  // Aynı sebeple: haftanın/sezonun birincisi ödülü, Pazartesi 09:00 sınırı
  // geçer geçmez ilk isteği yapan kullanıcının kendisi tarafından tetiklenir.
  // Her ikisi de kendi idempotency guard'ını taşıyor (WeeklyChampion/
  // SeasonChampion'daki unique alan), bu yüzden sık çağrılmaları güvenli.
  await awardWeeklyChampionIfDue().catch((err) =>
    console.error("Haftanın birincisi ödülü başarısız:", err)
  );
  await awardSeasonChampionIfDue().catch((err) =>
    console.error("Sezon birincisi ödülü başarısız:", err)
  );
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

export type WeeklyBankoStatus = {
  predictionId: string;
  matchId: string;
  label: string;
  locked: boolean;
} | null;

// The user's currently-assigned Banko for the current week, if any and if
// still open — drives the bet-slip's toggle (is this pick already the
// Banko, is it moveable, or is a different match's pick locked in instead).
export async function getWeeklyBankoStatus(userId: string, now: Date = new Date()): Promise<WeeklyBankoStatus> {
  const current = await prisma.prediction.findFirst({
    where: {
      userId,
      isBanko: true,
      status: "open",
      match: { kickoff: { gte: weekStartFor(now), lt: weekEndFor(now) } },
    },
    select: { id: true, matchId: true, match: { select: { homeTeam: true, awayTeam: true, kickoff: true } } },
  });
  if (!current) return null;

  return {
    predictionId: current.id,
    matchId: current.matchId,
    label: `${current.match.homeTeam} – ${current.match.awayTeam}`,
    locked: current.match.kickoff.getTime() <= now.getTime(),
  };
}

export type Budget = { cap: number; used: number; remaining: number };

function toBudget(cap: number, used: number): Budget {
  return { cap, used, remaining: Math.max(0, cap - used) };
}

export type WeeklyBudgetMatch = { matchId: string; label: string; stake: number };
export type WeeklyBudgetBreakdown = Budget & { byMatch: WeeklyBudgetMatch[] };

// The current week's kasa usage, broken down by match — shown on the wallet
// screen. `used` can exceed `cap` for a user who already had open/settled
// predictions this week before the kasa limit shipped: it isn't enforced
// retroactively, only on new predictions going forward (see
// app/api/predictions/route.ts), so a week that was already in progress at
// rollout can show more than ₺1.000 until it resets next Monday.
export async function getWeeklyBudgetBreakdown(
  userId: string,
  now: Date = new Date()
): Promise<WeeklyBudgetBreakdown> {
  const rows = await prisma.prediction.findMany({
    where: {
      userId,
      gift: { is: null },
      status: { in: ["open", "won", "lost"] },
      match: { kickoff: { gte: weekStartFor(now), lt: weekEndFor(now) } },
    },
    select: { stake: true, matchId: true, match: { select: { homeTeam: true, awayTeam: true } } },
  });

  const byMatchMap = new Map<string, WeeklyBudgetMatch>();
  let used = 0;
  for (const r of rows) {
    used += r.stake;
    const entry = byMatchMap.get(r.matchId) ?? {
      matchId: r.matchId,
      label: `${r.match.homeTeam} – ${r.match.awayTeam}`,
      stake: 0,
    };
    entry.stake += r.stake;
    byMatchMap.set(r.matchId, entry);
  }

  const byMatch = [...byMatchMap.values()].sort((a, b) => b.stake - a.stake);
  const cap = await weeklyBudgetCapFor(userId, weekStartFor(now));
  return { ...toBudget(cap, used), byMatch };
}

// Per-match and per-match's-week budgets for a batch of matches, keyed by
// matchId — a match can belong to a different week than "now" if fixtures
// are already posted for next week, so each match's own kickoff decides
// which week's kasa it draws from.
export async function getMatchBudgets(
  userId: string,
  matches: { id: string; kickoff: Date }[]
): Promise<Map<string, { weekBudget: Budget; matchBudget: Budget }>> {
  const result = new Map<string, { weekBudget: Budget; matchBudget: Budget }>();
  if (matches.length === 0) return result;

  const starts = matches.map((m) => weekStartFor(m.kickoff).getTime());
  const ends = matches.map((m) => weekEndFor(m.kickoff).getTime());
  const rangeStart = new Date(Math.min(...starts));
  const rangeEnd = new Date(Math.max(...ends));

  const rows = await prisma.prediction.findMany({
    where: {
      userId,
      gift: { is: null },
      status: { in: ["open", "won", "lost"] },
      match: { kickoff: { gte: rangeStart, lt: rangeEnd } },
    },
    select: { stake: true, matchId: true, match: { select: { kickoff: true } } },
  });

  const perMatch = new Map<string, number>();
  const perWeek = new Map<number, number>();
  for (const r of rows) {
    perMatch.set(r.matchId, (perMatch.get(r.matchId) ?? 0) + r.stake);
    const weekKey = weekStartFor(r.match.kickoff).getTime();
    perWeek.set(weekKey, (perWeek.get(weekKey) ?? 0) + r.stake);
  }

  const distinctWeekStarts = [...new Set(matches.map((m) => weekStartFor(m.kickoff).getTime()))].map(
    (ms) => new Date(ms)
  );
  const boosted = await boostedWeekStarts(userId, distinctWeekStarts);

  for (const m of matches) {
    const weekKey = weekStartFor(m.kickoff).getTime();
    const cap = boosted.has(weekKey) ? WEEKLY_BUDGET * DOUBLE_KASA_MULTIPLIER : WEEKLY_BUDGET;
    result.set(m.id, {
      weekBudget: toBudget(cap, perWeek.get(weekKey) ?? 0),
      matchBudget: toBudget(PER_MATCH_CAP, perMatch.get(m.id) ?? 0),
    });
  }
  return result;
}

export async function getWalletSummary(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [user, openPredictions, settledThisWeek, weeklyBudget] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.prediction.findMany({ where: { userId, status: "open" } }),
    prisma.prediction.findMany({
      where: { userId, status: { in: ["won", "lost"] }, settledAt: { gte: weekAgo } },
      include: { gift: { select: { id: true } } },
    }),
    getWeeklyBudgetBreakdown(userId),
  ]);

  const lockedInOpen = openPredictions.reduce((sum, p) => sum + p.stake, 0);
  const potentialReturn = openPredictions.reduce(
    (sum, p) => sum + Math.round(p.stake * p.oddsAtPick),
    0
  );
  const weekChange = settledThisWeek.reduce((sum, p) => {
    // A gifted prediction's stake came out of the sender's balance, never this
    // user's — so a losing gift costs them nothing and only the payout counts.
    const cost = p.gift ? 0 : p.stake;
    // Uniform for won/lost: payout is 0 for a plain loss (net = -cost), the
    // refunded stake for a sigorta-covered loss (net = 0), and the (possibly
    // Banko-doubled) winnings for a win — no per-status branching needed.
    return sum + (p.payout ?? 0) - cost;
  }, 0);

  return {
    // Toplam bakiye = kullanılabilir bakiye. Açık bir tahmine ayrılan tutar
    // o an harcanmış sayılır — kazanılırsa kullanılabilire geri döner,
    // kaybedilirse hiç dönmez. O yüzden sonuçlanmamışken "senin" değil.
    available: user.balance,
    lockedInOpen,
    total: user.balance,
    potentialReturn,
    openCount: openPredictions.length,
    weekChange,
    totalNet: user.balance - user.startBalance,
    weeklyBudget,
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
    where: { userId, status: { in: ["won", "lost", "cancelled"] } },
    include: { match: true },
    orderBy: { settledAt: "desc" },
  });
}

export async function getPerformanceStats(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const predictions = await prisma.prediction.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    include: { gift: { select: { id: true } } },
  });
  const settled = predictions.filter((p) => p.status !== "open");
  const won = predictions.filter((p) => p.status === "won");
  const netEffect = settled.reduce((sum, p) => {
    // A cancelled (postponed match) prediction was refunded in full — no net
    // effect either way, so it must not fall into the uniform math below.
    if (p.status === "cancelled") return sum;
    // Gifted predictions were paid for by the sender — see getWalletSummary.
    const cost = p.gift ? 0 : p.stake;
    return sum + (p.payout ?? 0) - cost;
  }, 0);

  return {
    total: predictions.length,
    correct: won.length,
    netEffect,
  };
}

export type ActivityItem = {
  id: string;
  kind: "system" | "lock" | "win" | "loss" | "cancel" | "insured";
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
      const cancelled = p.status === "cancelled";
      const insuredLoss = p.status === "lost" && p.wasInsured;
      items.push({
        id: `${p.id}-settle`,
        kind: cancelled ? "cancel" : insuredLoss ? "insured" : p.status === "won" ? "win" : "loss",
        title: cancelled ? `${label} ertelendi` : `${label} sonucu işlendi`,
        subtitle: cancelled ? "İade edildi" : insuredLoss ? "Sigortalı · iade aldın" : "Maç sonucu",
        amount: cancelled
          ? p.stake
          : insuredLoss
          ? p.payout ?? p.stake
          : p.status === "won"
          ? (p.payout ?? 0)
          : -p.stake,
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
  stake: number;
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
    stake: p.stake,
    homeTeam: p.match.homeTeam,
    awayTeam: p.match.awayTeam,
    isYou: p.userId === currentUserId,
    at: p.createdAt,
  }));
}

export type LeaderboardRow = {
  rank: number;
  id: string;
  displayName: string;
  favoriteTeam: string | null;
  net: number;
  correct: number;
  total: number;
  accuracy: number; // 0-100, 0 when nothing has settled yet
  isYou: boolean;
};

export type LeaderboardScope = {
  ranked: LeaderboardRow[];
  you: LeaderboardRow | null;
  totalPlayers: number;
  rangeStart: string;
  rangeEnd: string;
};

type Tally = { net: number; correct: number; total: number };

function buildScope(
  users: { id: string; displayName: string; favoriteTeam: string | null }[],
  tally: Map<string, Tally>,
  rangeStart: Date,
  rangeEnd: Date,
  currentUserId: string
): LeaderboardScope {
  const scored = users.map((u) => {
    const t = tally.get(u.id) ?? { net: 0, correct: 0, total: 0 };
    return {
      id: u.id,
      displayName: u.displayName,
      favoriteTeam: u.favoriteTeam,
      net: t.net,
      correct: t.correct,
      total: t.total,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      isYou: u.id === currentUserId,
    };
  });

  // Net kâr önce; eşitlikte önce isabet yüzdesi, sonra aynı kârı daha az
  // kuponla yapan, en son alfabetik ayırır.
  scored.sort(
    (a, b) =>
      b.net - a.net ||
      b.accuracy - a.accuracy ||
      a.total - b.total ||
      a.displayName.localeCompare(b.displayName, "tr")
  );

  const ranked: LeaderboardRow[] = scored.map((s, i) => ({ rank: i + 1, ...s }));
  return {
    ranked,
    you: ranked.find((r) => r.isYou) ?? null,
    totalPlayers: ranked.length,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  };
}

// Ranks players by net kâr (payout minus stake on settled, self-placed
// predictions) — bakiye değil, isabet konuşuyor. Season always fully
// contains its weeks, so a single season-range query is bucketed in memory
// for the week scope instead of running the query twice.
//
// `memberIds`, when given, scopes both the roster and the tally to that set
// — this is the entire mechanism behind a league's leaderboard (Faz 3):
// same ranking, same net-kâr math, just restricted to the league's members.
export async function getLeaderboard(
  currentUserId: string,
  now: Date = new Date(),
  memberIds?: string[]
): Promise<{ week: LeaderboardScope; season: LeaderboardScope }> {
  const weekStart = weekStartFor(now);
  const weekEnd = weekEndFor(now);
  const seasonStart = seasonStartFor(now);
  const seasonEnd = seasonEndFor(now);

  const [users, seasonPredictions] = await Promise.all([
    prisma.user.findMany({
      where: memberIds ? { id: { in: memberIds } } : undefined,
      select: { id: true, displayName: true, favoriteTeam: true },
    }),
    prisma.prediction.findMany({
      where: {
        status: { in: ["won", "lost"] },
        gift: { is: null },
        match: { kickoff: { gte: seasonStart, lt: seasonEnd } },
        ...(memberIds ? { userId: { in: memberIds } } : {}),
      },
      select: { userId: true, status: true, stake: true, payout: true, match: { select: { kickoff: true } } },
    }),
  ]);

  const seasonTally = new Map<string, Tally>();
  const weekTally = new Map<string, Tally>();

  for (const p of seasonPredictions) {
    const inThisWeek = p.match.kickoff >= weekStart && p.match.kickoff < weekEnd;
    for (const tally of inThisWeek ? [seasonTally, weekTally] : [seasonTally]) {
      const bucket = tally.get(p.userId) ?? { net: 0, correct: 0, total: 0 };
      bucket.total++;
      if (p.status === "won") bucket.correct++;
      // Uniform for won/lost: payout is 0 for a plain loss, the refunded
      // stake for a sigorta-covered one, and the (possibly Banko-doubled)
      // winnings for a win.
      bucket.net += (p.payout ?? 0) - p.stake;
      tally.set(p.userId, bucket);
    }
  }

  return {
    week: buildScope(users, weekTally, weekStart, weekEnd, currentUserId),
    season: buildScope(users, seasonTally, seasonStart, seasonEnd, currentUserId),
  };
}
