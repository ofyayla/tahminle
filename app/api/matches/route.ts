import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  getCommunityPulse,
  getMatchBudgets,
  getUpcomingMatches,
  getWalletSummary,
  getWeeklyBankoStatus,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import type { MatchDTO } from "@/lib/types";

// getUpcomingMatches() -> syncMatchState() can fall back to a headless-browser
// live-score scrape (lib/liveScoreScraper.ts), which needs more than the
// default timeout.
export const maxDuration = 30;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [matches, wallet, openPredictions, weeklyBanko] = await Promise.all([
    getUpcomingMatches(),
    getWalletSummary(userId),
    prisma.prediction.findMany({
      where: { userId, status: "open" },
      select: { matchId: true, market: true, choice: true },
    }),
    getWeeklyBankoStatus(userId),
  ]);

  const openByMatchId = new Map<string, Record<string, string>>();
  for (const p of openPredictions) {
    const bucket = openByMatchId.get(p.matchId) ?? {};
    bucket[p.market] = p.choice;
    openByMatchId.set(p.matchId, bucket);
  }
  const [pulseByMatchId, budgetsByMatchId] = await Promise.all([
    getCommunityPulse(matches.map((m) => m.id)),
    getMatchBudgets(userId, matches),
  ]);

  const matchDTOs: MatchDTO[] = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    league: m.league,
    kickoff: m.kickoff.toISOString(),
    oddsHome: m.oddsHome,
    oddsDraw: m.oddsDraw,
    oddsAway: m.oddsAway,
    prevOddsHome: m.prevOddsHome,
    prevOddsDraw: m.prevOddsDraw,
    prevOddsAway: m.prevOddsAway,
    extraOdds: {
      over25: m.over25,
      under25: m.under25,
      bttsYes: m.bttsYes,
      bttsNo: m.bttsNo,
      dc1X: m.dc1X,
      dc12: m.dc12,
      dcX2: m.dcX2,
      extraMarkets: (m.extraMarkets as Record<string, number> | null) ?? null,
    },
    status: m.status,
    liveScore: m.status === "live" && m.homeScore != null && m.awayScore != null
      ? { home: m.homeScore, away: m.awayScore }
      : null,
    aiAnalysis: m.aiAnalysis,
    openByMarket: openByMatchId.get(m.id) ?? {},
    pulse: pulseByMatchId[m.id] ?? { total: 0, home: 0, draw: 0, away: 0 },
    weekBudget: budgetsByMatchId.get(m.id)?.weekBudget ?? { cap: 0, used: 0, remaining: 0 },
    matchBudget: budgetsByMatchId.get(m.id)?.matchBudget ?? { cap: 0, used: 0, remaining: 0 },
  }));

  return NextResponse.json({ matches: matchDTOs, available: wallet.available, weeklyBanko });
}
