import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

// Mirrors League.inviteCode's alphabet — no 0/O/1/I, easy to read aloud/type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// A personal code every user carries from signup, independent of any one
// league's own inviteCode. It's what a share link's `?ref=` is built from, so
// a friend-league invite can credit the specific person who sent it rather
// than just whoever owns the league. Retried on collision the same way
// League.inviteCode is — vanishingly unlikely at this table size.
export async function generateUniqueReferralCode(
  client: Pick<PrismaClient, "user"> = prisma
): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = randomCode();
    const existing = await client.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  // Effectively unreachable at this table size — a caller still needs some
  // value back rather than a hang, so fall back to a code that's unique by
  // construction (timestamp suffix) instead of retrying forever.
  return `${randomCode().slice(0, 4)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

// Balance bonus paid to both sides of a referral when it's redeemed at
// signup. This doesn't touch the leaderboard — net kâr is computed from
// settled predictions, never raw balance (lib/data.ts) — it only widens how
// much of the weekly kasa someone has room to actually use.
export const REFERRAL_BONUS = 100;

// Soft cap so one account can't farm free balance by registering a pile of
// throwaway accounts through its own link. Generous on purpose: this is
// virtual currency with no path to real money and no effect on ranking, so
// the cap exists to bound noise, not to police a real economic attack.
export const REFERRAL_MAX_REWARDED = 15;

// Pays out the referral bonus for one brand-new membership, if `referrerId`
// still has headroom under the cap. Must run inside the same transaction
// that creates the membership/user — LeagueMembership.rewardGranted flips
// alongside the balance credits so a retried request can never pay twice.
// Returns whether the reward was actually granted (false past the cap).
export async function grantReferralReward(
  tx: Prisma.TransactionClient,
  params: { membershipId: string; referrerId: string; newUserId: string }
): Promise<boolean> {
  const { membershipId, referrerId, newUserId } = params;

  const grantedCount = await tx.leagueMembership.count({
    where: { invitedById: referrerId, rewardGranted: true },
  });
  if (grantedCount >= REFERRAL_MAX_REWARDED) return false;

  await tx.leagueMembership.update({ where: { id: membershipId }, data: { rewardGranted: true } });
  await tx.user.update({ where: { id: referrerId }, data: { balance: { increment: REFERRAL_BONUS } } });
  await tx.user.update({ where: { id: newUserId }, data: { balance: { increment: REFERRAL_BONUS } } });
  return true;
}
