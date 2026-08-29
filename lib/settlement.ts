import { prisma } from "./prisma";
import { isWinningChoice, parseScoreChoice, type MarketCode } from "./markets";
import { fetchRealResults, findRealResult } from "./resultsBackend";
import { getLiveScore } from "./liveScoreScraper";
import { TRACKED_TEAMS } from "./scraper";
import { sendPushToUsers, usersWithOpenPredictionsOn } from "./push";

// If no real result is available by this long after kickoff, give up waiting
// rather than leaving predictions stuck open forever. Note: a match dropping
// out of the pre-match odds bulletin is NOT a useful "abandoned/orphan"
// signal — every match does that the moment it goes live, since pre-match
// odds stop applying. There used to be a much shorter fallback window keyed
// off that signal, which caused essentially every live match to time out
// ~20 minutes after kickoff, while it was still being played. Always give
// the full grace period instead.
const RESULT_GRACE_MS = 115 * 60 * 1000;

// The Nesine scrape fallback launches a real headless browser (~2-20s) — far
// too slow to redo on every single page load. Skip it if we scraped this
// match recently; stored on the row itself (not an in-memory cache) since
// serverless invocations don't share memory across instances.
//
// Kept comfortably above the external cron's ~60s interval (cron-job.org
// fires with its own scheduling jitter, observed up to ~27s late) — if this
// were shorter than the real gap between cron runs, a user's own page load
// would end up paying for the slow scrape itself during that gap, which is
// exactly the "first load is slow" symptom the cron was meant to eliminate.
const SCRAPE_THROTTLE_MS = 100 * 1000;

type MatchResultOutcome = {
  result: "1" | "X" | "2";
  resultOver25: boolean | null;
  resultBtts: boolean | null;
  homeScore: number | null;
  awayScore: number | null;
};

// Derives a deterministic outcome from a scoreline we already have on hand —
// e.g. the last score our own live-score scrape picked up — rather than
// gambling on a random simulation when one isn't strictly necessary.
function outcomeFromScore(homeScore: number, awayScore: number): MatchResultOutcome {
  return {
    result: homeScore > awayScore ? "1" : homeScore < awayScore ? "2" : "X",
    resultOver25: homeScore + awayScore > 2.5,
    resultBtts: homeScore > 0 && awayScore > 0,
    homeScore,
    awayScore,
  };
}

type StartedMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  notifiedScore: string | null;
};

// Pushes a "GOL!" to everyone holding an open prediction on a match whose
// score just moved.
//
// The first score we ever see for a match is recorded silently rather than
// announced: a cold start mid-match would otherwise fire "GOL!" for a goal
// that was scored half an hour ago. In practice the cron picks a match up at
// 0-0 within a minute of kickoff, so only the genuinely-missed first goal of
// a match is ever lost this way.
async function notifyGoals(
  matches: StartedMatch[],
  updates: { matchId: string; homeScore: number; awayScore: number }[]
) {
  const byId = new Map(matches.map((m) => [m.id, m]));

  await Promise.all(
    updates.map(async (u) => {
      const match = byId.get(u.matchId);
      if (!match) return;

      const scoreKey = `${u.homeScore}-${u.awayScore}`;
      if (match.notifiedScore === scoreKey) return;

      const previous = match.notifiedScore;
      await prisma.match.update({
        where: { id: u.matchId },
        data: { notifiedScore: scoreKey },
      });
      if (previous == null) return;

      const [prevHome, prevAway] = previous.split("-").map(Number);
      // Only a rising score is a goal. A correction downwards (provider
      // fixing a bad read, a disallowed goal) shouldn't be announced.
      if (u.homeScore + u.awayScore <= prevHome + prevAway) return;

      const scorer = u.homeScore > prevHome ? match.homeTeam : match.awayTeam;
      const userIds = await usersWithOpenPredictionsOn(u.matchId);

      await sendPushToUsers(userIds, {
        title: `⚽ GOL! ${scorer}`,
        body: `${match.homeTeam} ${u.homeScore}-${u.awayScore} ${match.awayTeam}`,
        data: { type: "goal", matchId: u.matchId },
      });
    })
  );
}

export async function settleDueMatches() {
  const now = Date.now();

  const startedMatches = await prisma.match.findMany({
    where: {
      status: { in: ["upcoming", "live"] },
      kickoff: { lt: new Date(now) },
    },
    include: {
      predictions: {
        where: { status: "open" },
        // gift.senderId: a cancelled gift pick refunds the sender (who
        // actually paid for it), never the recipient (see toCancel below).
        include: { gift: { select: { senderId: true } } },
      },
    },
  });

  if (startedMatches.length === 0) return 0;

  // Sigorta jokeri kullanılmış açık tahminler — bu turda kaybeden bir
  // tahmin bu sette varsa iade edilecek. Tek sorguda toplanır, per-tahmin
  // ayrı bir sorguya gerek kalmaz.
  const openPredictionIds = startedMatches.flatMap((m) => m.predictions.map((p) => p.id));
  const insuredPredictionIds = new Set(
    (
      await prisma.seasonPerk.findMany({
        where: { kind: "insurance", predictionId: { in: openPredictionIds } },
        select: { predictionId: true },
      })
    ).map((r) => r.predictionId!)
  );

  let realResults: Awaited<ReturnType<typeof fetchRealResults>> = [];
  try {
    realResults = await fetchRealResults();
  } catch (err) {
    console.error("Gerçek sonuç servisi alınamadı, gerekirse maç erteleme/iade akışına düşülecek:", err);
  }

  const toSettle: { match: (typeof startedMatches)[number]; outcome: MatchResultOutcome }[] = [];
  // No confirmed result AND no observed scoreline after the full grace
  // period — genuinely unknown whether this was even played (postponed,
  // abandoned, or just a data-feed gap). There's no way to tell those apart
  // from here, and settling money on a fabricated coin-flip result would be
  // wrong regardless of which one it was — so these get cancelled and
  // refunded instead of settled.
  const toCancel: (typeof startedMatches)[number][] = [];
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

    if (elapsed > RESULT_GRACE_MS) {
      // We may already have a real scoreline sitting on the row from an
      // earlier live-score update (real API or the Nesine scrape) even
      // though nothing ever confirmed the match as "completed" — that's
      // genuinely observed data, so settle from it. Only cancel when there's
      // truly nothing to go on.
      if (match.homeScore != null && match.awayScore != null) {
        toSettle.push({ match, outcome: outcomeFromScore(match.homeScore, match.awayScore) });
      } else {
        toCancel.push(match);
      }
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
    await notifyGoals(startedMatches, liveScoreUpdates);
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

      // Collected per user so someone holding four picks on one match gets a
      // single summary push instead of four separate buzzes.
      const outcomeByUser = new Map<string, { won: number; lost: number; payout: number; staked: number }>();

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

          const insured = !won && insuredPredictionIds.has(pred.id);
          // Banko: a won pick doubles its payout — the whole point of the
          // weekly captain's call. Sigorta: a lost pick that was insured
          // gets its stake back instead, status still "lost" since the call
          // itself was wrong, just covered.
          const payout = won
            ? Math.round(pred.stake * pred.oddsAtPick) * (pred.isBanko ? 2 : 1)
            : insured
            ? pred.stake
            : 0;

          // Same guard, per-prediction: only credit balance if this call is
          // the one that actually transitions it out of "open".
          const predClaim = await prisma.prediction.updateMany({
            where: { id: pred.id, status: "open" },
            data: { status: won ? "won" : "lost", payout, wasInsured: insured, settledAt: new Date() },
          });
          if (predClaim.count === 0) return;

          if (payout > 0) {
            await prisma.user.update({
              where: { id: pred.userId },
              data: { balance: { increment: payout } },
            });
          }

          const bucket = outcomeByUser.get(pred.userId) ?? { won: 0, lost: 0, payout: 0, staked: 0 };
          if (won) bucket.won++;
          else bucket.lost++;
          bucket.payout += payout;
          // An insured loss cost nothing, same reason a gift's stake never
          // came out of its recipient's own pocket — neither should count
          // as "staked" in the summary push.
          bucket.staked += insured || pred.gift ? 0 : pred.stake;
          outcomeByUser.set(pred.userId, bucket);
        })
      );

      await notifySettled(match, outcomeByUser);
    })
  );

  let cancelledCount = 0;

  await Promise.all(
    toCancel.map(async (match) => {
      // Same claim pattern as settlement: only the run that actually flips
      // the match out of upcoming/live processes its refunds.
      const claim = await prisma.match.updateMany({
        where: { id: match.id, status: { in: ["upcoming", "live"] } },
        data: { status: "postponed" },
      });
      if (claim.count === 0) return;
      cancelledCount++;

      const refundedByUser = new Map<string, number>();

      await Promise.all(
        match.predictions.map(async (pred) => {
          const predClaim = await prisma.prediction.updateMany({
            where: { id: pred.id, status: "open" },
            data: { status: "cancelled", payout: null, settledAt: new Date() },
          });
          if (predClaim.count === 0) return;

          // A gifted pick was paid for by the sender, not the recipient it
          // belongs to (see lib/gifts.ts) — refunding a cancelled one to
          // pred.userId would hand the recipient money they never spent
          // while leaving the sender out the price they actually paid.
          const refundTo = pred.gift?.senderId ?? pred.userId;
          await prisma.user.update({
            where: { id: refundTo },
            data: { balance: { increment: pred.stake } },
          });

          refundedByUser.set(refundTo, (refundedByUser.get(refundTo) ?? 0) + pred.stake);
        })
      );

      await notifyCancelled(match, refundedByUser);
    })
  );

  return settledCount + cancelledCount;
}

// One push per user whose prediction on a postponed/abandoned match was
// refunded.
async function notifyCancelled(
  match: { id: string; homeTeam: string; awayTeam: string },
  refundedByUser: Map<string, number>
) {
  if (refundedByUser.size === 0) return;

  const label = `${match.homeTeam} – ${match.awayTeam}`;

  await Promise.all(
    [...refundedByUser].map(([userId, amount]) =>
      sendPushToUsers([userId], {
        title: "↩️ Maç ertelendi",
        body: `${label} · ₺${amount.toLocaleString("tr-TR")} bakiyene iade edildi`,
        data: { type: "cancelled", matchId: match.id },
      })
    )
  );
}

// One push per user per settled match, summarising how their picks did.
async function notifySettled(
  match: { id: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null },
  outcomeByUser: Map<string, { won: number; lost: number; payout: number; staked: number }>
) {
  if (outcomeByUser.size === 0) return;

  const label = `${match.homeTeam} – ${match.awayTeam}`;
  const score =
    match.homeScore != null && match.awayScore != null
      ? ` ${match.homeScore}-${match.awayScore}`
      : "";

  await Promise.all(
    [...outcomeByUser].map(([userId, o]) => {
      const net = o.payout - o.staked;
      const title = o.won > 0 ? `✅ ${o.won} tahminin tuttu!` : "❌ Tahminin tutmadı";
      const detail =
        o.won > 0 && o.lost > 0
          ? `${o.won} doğru, ${o.lost} yanlış · ${net >= 0 ? "+" : "−"}₺${Math.abs(net).toLocaleString("tr-TR")}`
          : o.won > 0
          ? `+₺${o.payout.toLocaleString("tr-TR")} kazandın`
          : `−₺${o.staked.toLocaleString("tr-TR")}`;

      return sendPushToUsers([userId], {
        title,
        body: `${label}${score} · ${detail}`,
        data: { type: "settled", matchId: match.id },
      });
    })
  );
}

// Also flip upcoming -> live once kickoff passes, for matches not yet due for settlement.
export async function refreshMatchStatuses() {
  await prisma.match.updateMany({
    where: { status: "upcoming", kickoff: { lt: new Date() } },
    data: { status: "live" },
  });
}
