import type { Prisma } from "@prisma/client";
import { weekEndFor, weekStartFor } from "./season";

export class BankoLockedError extends Error {}

type Tx = Prisma.TransactionClient;

// At most one Banko per user per week (Faz 2, "Her hafta bir kuponunu Banko
// işaretlersin") — there's no DB constraint for this since "week" isn't a
// stored column, only derived from the picked prediction's match kickoff, so
// this function is the single place that enforces it. Callers run it inside
// their own transaction: clearing the old pick and setting the new one must
// be atomic, or a crash in between would leave two Bankos (or none) standing.
//
// Locking: once the currently-assigned Banko's match has kicked off, it can
// no longer be moved elsewhere for the week ("maç başlayana kadar
// değiştirebilirsin; başlayınca kilitlenir") — unless that pick ended up
// cancelled (postponed match), in which case the slot frees back up rather
// than stranding the user without a Banko for the rest of the week.
export async function setWeeklyBanko(tx: Tx, userId: string, predictionId: string): Promise<void> {
  const target = await tx.prediction.findFirst({
    where: { id: predictionId, userId, status: "open", gift: { is: null } },
    select: { id: true, match: { select: { kickoff: true, status: true } } },
  });
  if (!target) {
    throw new Error("Bu tahmin bulunamadı veya Banko yapılamaz.");
  }
  if (target.match.status !== "upcoming") {
    throw new Error("Bu maç başladı, Banko olarak işaretlenemez.");
  }

  const weekStart = weekStartFor(target.match.kickoff);
  const weekEnd = weekEndFor(target.match.kickoff);

  const current = await tx.prediction.findFirst({
    where: { userId, isBanko: true, match: { kickoff: { gte: weekStart, lt: weekEnd } } },
    select: { id: true, status: true, match: { select: { kickoff: true } } },
  });

  if (current && current.id !== predictionId) {
    if (isLocked(current)) {
      throw new BankoLockedError("Bu haftanın bankosu kilitlendi, değiştirilemez.");
    }
    await tx.prediction.update({ where: { id: current.id }, data: { isBanko: false } });
  }

  await tx.prediction.update({ where: { id: predictionId }, data: { isBanko: true } });
}

export async function clearWeeklyBanko(tx: Tx, userId: string, predictionId: string): Promise<void> {
  const current = await tx.prediction.findFirst({
    where: { id: predictionId, userId, isBanko: true },
    select: { id: true, status: true, match: { select: { kickoff: true } } },
  });
  if (!current) return;
  if (isLocked(current)) {
    throw new BankoLockedError("Bu haftanın bankosu kilitlendi, kaldırılamaz.");
  }
  await tx.prediction.update({ where: { id: current.id }, data: { isBanko: false } });
}

function isLocked(pred: { status: string; match: { kickoff: Date } }): boolean {
  // A cancelled pick never got to play, so it doesn't tie up the slot.
  if (pred.status === "cancelled") return false;
  return pred.match.kickoff.getTime() <= Date.now();
}
