import { prisma } from "./prisma";
import { isWinningChoice, parseScoreChoice, type MarketCode } from "./markets";
import { fetchRealResults, findRealResult } from "./resultsBackend";
import { getLiveScore } from "./liveScoreScraper";
import { TRACKED_TEAMS } from "./scraper";

// If no real result is available by this long after kickoff, fall back to an
// odds-implied simulation rather than leaving predictions stuck open forever.
// Note: a match dropping out of the pre-match odds bulletin is NOT a useful
// "abandoned/orphan" signal — every match does that the moment it goes live,
// since pre-match odds stop applying. There used to be a much shorter
// fallback window keyed off that signal, which caused essentially every live
// match to get settled by simulation ~20 minutes after kickoff, while it was
// still being played. Always give the full grace period instead.
const SIMULATION_FALLBACK_MS = 115 * 60 * 1000;

// The Nesine scrape fallback launches a real headless browser (~2-20s) — far
// too slow to redo on every single page load. Skip it if we scraped this
// match recently; stored on the row itself (not an in-memory cache) since
// serverless invocations don't share memory across instances.
const SCRAPE_THROTTLE_MS = 45 * 1000;

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
  const scrapeCandidates: { matchId: string; trackedTeam: string }[] = [];

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

    if (elapsed > SIMULATION_FALLBACK_MS) {
      toSettle.push({ match, outcome: simulateOutcome(match) });
      continue;
    }

    // Still in progress: if the provider already exposes an in-play score,
    // surface it as "canlı skor" without settling anything yet.
    if (real && real.homeScore != null && real.awayScore != null) {
      liveScoreUpdates.push({ matchId: match.id, homeScore: real.homeScore, awayScore: real.awayScore });
      continue;
    }

    // The results API has no live score for this one (e.g. its quota is
    // exhausted) — fall back to scraping Nesine's live page. Display only:
    // a missed/failed scrape just means no update this cycle, never "over".
    const recentlyScraped =
      match.liveScoreUpdatedAt && now - match.liveScoreUpdatedAt.getTime() < SCRAPE_THROTTLE_MS;
    const trackedTeam = TRACKED_TEAMS.find((t) => match.homeTeam.includes(t) || match.awayTeam.includes(t));
    if (trackedTeam && !recentlyScraped) {
      scrapeCandidates.push({ matchId: match.id, trackedTeam });
    }
  }

  const scrapedAtMatchIds: string[] = [];

  if (scrapeCandidates.length > 0) {
    // Run scrapes in parallel — each spins up its own short-lived headless
    // browser, and sequentially awaiting them would multiply the ~2-10s cost
    // per simultaneously live match.
    const scraped = await Promise.all(
      scrapeCandidates.map(async (c) => ({
        matchId: c.matchId,
        score: await getLiveScore(c.trackedTeam).catch(() => null),
      }))
    );
    for (const s of scraped) {
      // Stamp the throttle timestamp even on a miss — a match Nesine's page
      // doesn't currently surface (network hiccup, odd naming) shouldn't be
      // retried on every single request either.
      scrapedAtMatchIds.push(s.matchId);
      if (s.score) liveScoreUpdates.push({ matchId: s.matchId, homeScore: s.score.homeScore, awayScore: s.score.awayScore });
    }
  }

  if (liveScoreUpdates.length > 0) {
    await Promise.all(
      liveScoreUpdates.map((u) =>
        prisma.match.update({
          where: { id: u.matchId },
          data: { homeScore: u.homeScore, awayScore: u.awayScore, liveScoreUpdatedAt: new Date() },
        })
      )
    );
  }

  const missedScrapeIds = scrapedAtMatchIds.filter((id) => !liveScoreUpdates.some((u) => u.matchId === id));
  if (missedScrapeIds.length > 0) {
    await prisma.match.updateMany({
      where: { id: { in: missedScrapeIds } },
      data: { liveScoreUpdatedAt: new Date() },
    });
  }

  let settledCount = 0;

  await Promise.all(
    toSettle.map(async ({ match, outcome }) => {
      const { result, resultOver25, resultBtts, homeScore, awayScore } = outcome;

      // Atomically claim this match for settlement. `settleDueMatches` can run
      // concurrently (overlapping requests, warm + cold instances, manual
      // re-syncs) — without this guard, two runs that both read the match
      // while it was still upcoming/live would both credit every winning
      // prediction's payout, double-paying users. Only the run whose
      // updateMany actually flips the status (count > 0) proceeds.
      const claim = await prisma.match.updateMany({
        where: { id: match.id, status: { in: ["upcoming", "live"] } },
        data: { status: "finished", result, resultOver25, resultBtts, homeScore, awayScore },
      });
      if (claim.count === 0) return;
      settledCount++;

      await Promise.all(
        match.predictions.map(async (pred) => {
          let won: boolean;
          if (pred.market === "EXTRA") {
            // Maç Skoru: only ever wins against a confirmed real scoreline.
            const guess = parseScoreChoice(pred.choice);
            won = !!guess && homeScore != null && awayScore != null && guess.home === homeScore && guess.away === awayScore;
          } else {
            won = isWinningChoice(pred.market as MarketCode, pred.choice, { result, resultOver25, resultBtts });
          }
          const payout = won ? Math.round(pred.stake * pred.oddsAtPick) : 0;

          // Same guard, per-prediction: only credit balance if this call is
          // the one that actually transitions it out of "open".
          const predClaim = await prisma.prediction.updateMany({
            where: { id: pred.id, status: "open" },
            data: { status: won ? "won" : "lost", payout, settledAt: new Date() },
          });
          if (predClaim.count === 0) return;

          if (won) {
            await prisma.user.update({
              where: { id: pred.userId },
              data: { balance: { increment: payout } },
            });
          }
        })
      );
    })
  );

  return settledCount;
}

// Also flip upcoming -> live once kickoff passes, for matches not yet due for settlement.
export async function refreshMatchStatuses() {
  await prisma.match.updateMany({
    where: { status: "upcoming", kickoff: { lt: new Date() } },
    data: { status: "live" },
  });
}
