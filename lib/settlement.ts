import { prisma } from "./prisma";

// Matches with no live-score feed are settled after this grace period post-kickoff,
// using an odds-implied probability draw as a stand-in for the real result.
const SETTLE_AFTER_MS = 115 * 60 * 1000;

function pickWeightedOutcome(oddsHome: number, oddsDraw: number, oddsAway: number) {
  const wHome = 1 / oddsHome;
  const wDraw = 1 / oddsDraw;
  const wAway = 1 / oddsAway;
  const total = wHome + wDraw + wAway;
  const r = Math.random() * total;
  if (r < wHome) return "1";
  if (r < wHome + wDraw) return "X";
  return "2";
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
      const result = pickWeightedOutcome(match.oddsHome, match.oddsDraw, match.oddsAway);

      await Promise.all([
        prisma.match.update({
          where: { id: match.id },
          data: { status: "finished", result },
        }),
        ...match.predictions.map(async (pred) => {
          const won = pred.choice === result;
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
