import { prisma } from "./prisma";

// Permanent account deletion.
//
// Google Play requires every app that lets people create an account to offer
// in-app deletion, and app/gizlilik-politikasi promises the data actually
// goes away — so this is a hard delete, not a soft flag.
//
// Only OAuthAccount and PushToken cascade from User in the schema; everything
// else references it without an onDelete rule, which means Postgres would
// reject `user.delete()` outright until those rows are gone. Hence the
// explicit, ordered sweep below. It runs in one transaction: a half-deleted
// account (predictions gone, user still there) would be far worse than a
// failed request the caller can retry.

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

// The sweep touches ~8 tables for a heavy account; the 5s default occasionally
// wasn't enough against the pooled Supabase connection.
const TRANSACTION_TIMEOUT_MS = 20000;

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "Hesap bulunamadı." };

  // Leagues this user owns need a decision before anything is deleted: the
  // League->owner relation has no onDelete rule, so leaving them in place
  // would block the delete. Deleting them outright is the wrong answer —
  // LeagueMembership cascades from League, so one person leaving would
  // silently destroy a league other people are still playing in. Instead the
  // league is handed to its longest-standing remaining member, which matches
  // leaveLeague's stance in lib/leagues.ts that a league always needs someone
  // in charge. Only a league with nobody else left is actually deleted.
  const ownedLeagues = await prisma.league.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      members: {
        where: { userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { userId: true },
      },
    },
  });

  await prisma.$transaction(
    async (tx) => {
      for (const league of ownedLeagues) {
        const heir = league.members[0];
        if (heir) {
          await tx.league.update({
            where: { id: league.id },
            data: { ownerId: heir.userId },
          });
        } else {
          await tx.league.delete({ where: { id: league.id } });
        }
      }

      // Gifts first: Gift.predictionId is a required FK onto Prediction, so
      // deleting the user's predictions while a gift still points at one
      // would fail. Every gift that references a prediction of theirs has
      // them as the recipient (a gift creates the prediction it is wrapped
      // around), so filtering on either side covers it.
      await tx.gift.deleteMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      });

      // SeasonPerk is a retired feature (jokerler kaldırıldı) whose table
      // still exists with rows pointing at users — they must still go before
      // the user delete, or its userId FK blocks it.
      await tx.seasonPerk.deleteMany({ where: { userId } });
      await tx.prediction.deleteMany({ where: { userId } });

      // Transfers are two-sided. Deleting them erases the row from the
      // counterparty's history too, but their balance already moved and is
      // stored on User — no money is unwound by this, only the record of a
      // transfer involving an account that no longer exists.
      await tx.transfer.deleteMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      });

      // Championship rows double as the award idempotency guard via their
      // unique week/season columns. Safe to remove: awardWeeklyChampionIfDue
      // only ever looks at the single most recently closed period, so an old
      // row disappearing can't retrigger anything, and if the current one
      // goes it re-awards to the next best player — which is the right
      // outcome when the winner has left.
      await tx.weeklyChampion.deleteMany({ where: { userId } });
      await tx.seasonChampion.deleteMany({ where: { userId } });

      // Their own memberships in leagues owned by other people. Leagues they
      // owned are already handled above.
      await tx.leagueMembership.deleteMany({ where: { userId } });

      // OAuthAccount and PushToken cascade; LeagueMembership.invitedById is
      // SetNull, so people they invited keep their memberships.
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: TRANSACTION_TIMEOUT_MS }
  );

  return { ok: true };
}
