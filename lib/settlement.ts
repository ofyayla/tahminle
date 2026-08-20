import { prisma } from "./prisma";
import { isWinningChoice, parseScoreChoice, type MarketCode } from "./markets";
import { fetchRealResults, findRealResult } from "./resultsBackend";
import { isCurrentlySourced } from "./scraper";

// If no real result is available by this long after kickoff, fall back to an
// odds-implied simulation rather than leaving predictions stuck open forever.
// A match the odds source has stopped listing entirely (an orphan — usually
// a competition our results provider doesn't cover) gets a much shorter
// grace period, since we already know no real result is ever coming.
const SIMULATION_FALLBACK_MS = 115 * 60 * 1000;
const ORPHAN_FALLBACK_MS = 20 * 60 * 1000;

function pickWeighted(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

function pickOutcome1X2(oddsHome: number, oddsDraw: number, oddsAway: number): "1" | "X" | "2" {
  return pickWeighted({ "1": 1 / oddsHome, X: 1 / oddsDraw, "2": 1 / oddsAway }) as "1" | "X" | "2";
}

// A binary market (over/under, btts) simulated from its own implied
// probabilities — independent of the 1X2 result, same as a real match would be.
function pickBinary(oddsA: number, oddsB: number): boolean {
  return pickWeighted({ a: 1 / oddsA, b: 1 / oddsB }) === "a";
}

type MatchResultOutcome = {
  result: "1" | "X" | "2";
  resultOver25: boolean | null;
  resultBtts: boolean | null;
  homeScore: number | null;
  awayScore: number | null;
};

function simulateOutcome(match: {
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
}): MatchResultOutcome {
  return {
    result: pickOutcome1X2(match.oddsHome, match.oddsDraw, match.oddsAway),
    resultOver25:
      match.over25 != null && match.under25 != null ? pickBinary(match.over25, match.under25) : null,
    resultBtts: match.bttsYes != null && match.bttsNo != null ? pickBinary(match.bttsYes, match.bttsNo) : null,
    // No real scoreline to fall back on — Maç Skoru (EXTRA) predictions lose by default in this case.
    homeScore: null,
    awayScore: null,
  };
}

export async function settleDueMatches() {
  const now = Date.now();

  const startedMatches = await prisma.match.findMany({
    where: {
      status: { in: ["upcoming", "live"] },
      kickoff: { lt: new Date(now) },
    },
    include: { predictions: { where: { status: "open" } } },
  });

  if (startedMatches.length === 0) return 0;

  let realResults: Awaited<ReturnType<typeof fetchRealResults>> = [];
  try {
    realResults = await fetchRealResults();
  } catch (err) {
    console.error("Gerçek sonuç servisi alınamadı, gerekirse simülasyona düşülecek:", err);
  }

  const toSettle: { match: (typeof startedMatches)[number]; outcome: MatchResultOutcome }[] = [];
  const liveScoreUpdates: { matchId: string; homeScore: number; awayScore: number }[] = [];

  for (const match of startedMatches) {
    const real = findRealResult(match, realResults);

    if (real?.completed && real.winner) {
      const total = real.homeScore != null && real.awayScore != null ? real.homeScore + real.awayScore : null;
      toSettle.push({
        match,
        outcome: {
          result: real.winner,
          resultOver25: total != null ? total > 2.5 : null,
          resultBtts:
            real.homeScore != null && real.awayScore != null ? real.homeScore > 0 && real.awayScore > 0 : null,
          homeScore: real.homeScore,
          awayScore: real.awayScore,
        },
      });
      continue;
    }

    const elapsed = now - match.kickoff.getTime();
    const fallbackWindow = isCurrentlySourced(match.externalId) ? SIMULATION_FALLBACK_MS : ORPHAN_FALLBACK_MS;

    if (elapsed > fallbackWindow) {
      toSettle.push({ match, outcome: simulateOutcome(match) });
      continue;
    }

    // Still in progress: if the provider already exposes an in-play score,
    // surface it as "canlı skor" without settling anything yet.
    if (real && real.homeScore != null && real.awayScore != null) {
      liveScoreUpdates.push({ matchId: match.id, homeScore: real.homeScore, awayScore: real.awayScore });
    }
  }

  if (liveScoreUpdates.length > 0) {
    await Promise.all(
      liveScoreUpdates.map((u) =>
        prisma.match.update({
          where: { id: u.matchId },
          data: { homeScore: u.homeScore, awayScore: u.awayScore },
        })
      )
    );
  }

  await Promise.all(
    toSettle.map(async ({ match, outcome }) => {
      const { result, resultOver25, resultBtts, homeScore, awayScore } = outcome;

      await Promise.all([
        prisma.match.update({
          where: { id: match.id },
          data: { status: "finished", result, resultOver25, resultBtts, homeScore, awayScore },
        }),
        ...match.predictions.map(async (pred) => {
          let won: boolean;
          if (pred.market === "EXTRA") {
            // Maç Skoru: only ever wins against a confirmed real scoreline.
            const guess = parseScoreChoice(pred.choice);
            won = !!guess && homeScore != null && awayScore != null && guess.home === homeScore && guess.away === awayScore;
          } else {
            won = isWinningChoice(pred.market as MarketCode, pred.choice, { result, resultOver25, resultBtts });
          }
          const payout = won ? Math.round(pred.stake * pred.oddsAtPick) : 0;

          await Promise.all([
            prisma.prediction.update({
              where: { id: pred.id },
              data: { status: won ? "won" : "lost", payout, settledAt: new Date() },
            }),
            won
              ? prisma.user.update({
                  where: { id: pred.userId },
                  data: { balance: { increment: payout } },
                })
              : Promise.resolve(),
          ]);
        }),
      ]);
    })
  );

  return toSettle.length;
}

// Also flip upcoming -> live once kickoff passes, for matches not yet due for settlement.
export async function refreshMatchStatuses() {
  await prisma.match.updateMany({
    where: { status: "upcoming", kickoff: { lt: new Date() } },
    data: { status: "live" },
  });
}
