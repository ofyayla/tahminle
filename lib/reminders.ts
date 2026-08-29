import { prisma } from "./prisma";
import { formatTime } from "./format";
import { sendPushToUsers, usersWithOpenPredictionsOn } from "./push";

// How far ahead of kickoff the reminder goes out.
const REMINDER_LEAD_MS = 15 * 60 * 1000;

// Called from the cron. Notifies anyone holding an open prediction on a match
// that kicks off shortly — their last chance to look at it before betting
// locks. `startingSoonNotifiedAt` makes this once-per-match: the cron fires
// every ~60s, so without it every tick inside the window would re-notify.
export async function notifyStartingSoon(): Promise<number> {
  const now = Date.now();

  const soon = await prisma.match.findMany({
    where: {
      status: "upcoming",
      startingSoonNotifiedAt: null,
      kickoff: { gt: new Date(now), lte: new Date(now + REMINDER_LEAD_MS) },
    },
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
  });

  let sent = 0;

  for (const match of soon) {
    // Claim it first. Two overlapping cron runs would otherwise both pass the
    // `startingSoonNotifiedAt: null` filter and both send — the same guard
    // pattern settlement uses against double payouts.
    const claim = await prisma.match.updateMany({
      where: { id: match.id, startingSoonNotifiedAt: null },
      data: { startingSoonNotifiedAt: new Date() },
    });
    if (claim.count === 0) continue;

    const userIds = await usersWithOpenPredictionsOn(match.id);
    if (userIds.length === 0) continue;

    await sendPushToUsers(userIds, {
      title: "⏱ Maç birazdan başlıyor",
      body: `${match.homeTeam} – ${match.awayTeam} · ${formatTime(match.kickoff)}`,
      data: { type: "starting_soon", matchId: match.id },
    });
    sent++;
  }

  return sent;
}
