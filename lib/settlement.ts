import { prisma } from "./prisma";
import { isWinningChoice, type MarketCode } from "./markets";

// Matches with no live-score feed are settled after this grace period post-kickoff,
// using odds-implied probability draws as a stand-in for the real result.
const SETTLE_AFTER_MS = 115 * 60 * 1000;

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

export async function settleDueMatches() {
  const cutoff = new Date(Date.now() - SETTLE_AFTER_MS);

  const dueMatches = await prisma.match.findMany({
    where: {
      status: { in: ["upcoming", "live"] },
      kickoff: { lt: cutoff },
    },
    include: { predictions: { where: { status: "open" } } },
  });

  await Promise.all(
    dueMatches.map(async (match) => {
      const result = pickOutcome1X2(match.oddsHome, match.oddsDraw, match.oddsAway);
      const resultOver25 =
        match.over25 != null && match.under25 != null ? pickBinary(match.over25, match.under25) : null;
      const resultBtts =
        match.bttsYes != null && match.bttsNo != null ? pickBinary(match.bttsYes, match.bttsNo) : null;

      await Promise.all([
        prisma.match.update({
          where: { id: match.id },
          data: { status: "finished", result, resultOver25, resultBtts },
        }),
        ...match.predictions.map(async (pred) => {
          const won = isWinningChoice(pred.market as MarketCode, pred.choice, {
            result,
            resultOver25,
            resultBtts,
          });
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

  return dueMatches.length;
}

// Also flip upcoming -> live once kickoff passes, for matches not yet due for settlement.
export async function refreshMatchStatuses() {
  await prisma.match.updateMany({
    where: { status: "upcoming", kickoff: { lt: new Date() } },
    data: { status: "live" },
  });
}
