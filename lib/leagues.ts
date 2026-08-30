import { prisma } from "./prisma";
import { getLeaderboard, type LeaderboardScope } from "./data";
import { grantReferralReward, REFERRAL_BONUS } from "./referrals";
import { sendPushToUsers } from "./push";
import { formatTL } from "./format";

export type LeagueResult = { ok: true; leagueId: string; inviteCode: string } | { ok: false; error: string };
// JoinResult itself is defined further down, next to joinLeague — it grew a
// couple more fields (membershipId, created, invitedById) once referrals
// needed to know whether a join actually happened just now.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud/type
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

function randomInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createLeague(ownerId: string, name: string): Promise<LeagueResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    return { ok: false, error: "Lig adı 2-40 karakter arasında olmalı." };
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const inviteCode = randomInviteCode();
    try {
      const league = await prisma.league.create({
        data: {
          name: trimmed,
          inviteCode,
          ownerId,
          members: { create: { userId: ownerId } },
        },
      });
      return { ok: true, leagueId: league.id, inviteCode: league.inviteCode };
    } catch (err) {
      // Invite code collision — vanishingly unlikely at this table size, but
      // retry with a fresh code rather than surfacing a 500 for it.
      if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
        continue;
      }
      throw err;
    }
  }
  return { ok: false, error: "Lig oluşturulamadı, tekrar dener misin?" };
}

// Resolves a personal referral code (User.referralCode, see lib/referrals.ts)
// to the id of the specific member who shared it — but only if they're
// actually a member of *this* league. A code copy-pasted into the wrong
// league's join flow, or one that's simply invalid, resolves to null rather
// than erroring: attribution is a nice-to-have, never a reason to block a
// join.
async function resolveReferrer(leagueId: string, referralCode: string | null | undefined): Promise<string | null> {
  const code = referralCode?.trim().toUpperCase();
  if (!code) return null;

  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!referrer) return null;

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId: referrer.id } },
    select: { userId: true },
  });
  return membership ? referrer.id : null;
}

export type JoinOutcome = {
  ok: true;
  leagueId: string;
  membershipId: string;
  // Whether this call actually created the membership — false when the user
  // was already in the league (join is idempotent from their point of view).
  // Callers use this to decide whether a referral reward is even in play;
  // rejoining an existing league never pays out again.
  created: boolean;
  invitedById: string | null;
};
export type JoinResult = JoinOutcome | { ok: false; error: string };

// `referralCode` is the joiner's own personal code (lib/referrals.ts), not
// the league's inviteCode — passed through from a share link's `?ref=` param
// when the joiner arrived via one. Reward-granting is the caller's job (see
// app/api/auth/register/route.ts): this only resolves and records who gets
// credit, since not every joinLeague call is a new-user acquisition worth
// rewarding.
export async function joinLeague(
  userId: string,
  inviteCode: string,
  referralCode?: string | null
): Promise<JoinResult> {
  const league = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    select: { id: true },
  });
  if (!league) {
    return { ok: false, error: "Bu davet koduyla bir lig bulunamadı." };
  }

  const invitedById = await resolveReferrer(league.id, referralCode);

  try {
    const membership = await prisma.leagueMembership.create({
      data: { leagueId: league.id, userId, invitedById },
    });
    return { ok: true, leagueId: league.id, membershipId: membership.id, created: true, invitedById };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      // Already a member — join is idempotent from the user's view, and no
      // reward can fire for a membership that already existed.
      const existing = await prisma.leagueMembership.findUnique({
        where: { leagueId_userId: { leagueId: league.id, userId } },
        select: { id: true },
      });
      return { ok: true, leagueId: league.id, membershipId: existing?.id ?? "", created: false, invitedById: null };
    }
    throw err;
  }
}

// Joins a brand-new account to a league at the moment of registration, and
// pays out the referral bonus (lib/referrals.ts) when the invite carried a
// resolvable personal ref code. Membership creation and both balance credits
// happen in one transaction, so a crash between them can never leave a
// half-paid reward; the push to the referrer is a side effect that runs
// after the transaction commits, same as every other push in the app.
//
// A bad or expired invite code fails softly (`ok: false`) rather than
// throwing — the caller's job is to let registration itself succeed either
// way, since a typo'd code is not a reason to lose the whole signup.
export async function joinLeagueForNewUser(
  newUserId: string,
  inviteCode: string,
  referralCode?: string | null
): Promise<{ ok: true; leagueId: string; rewardGranted: boolean } | { ok: false; error: string }> {
  const league = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    select: { id: true },
  });
  if (!league) {
    return { ok: false, error: "Bu davet koduyla bir lig bulunamadı." };
  }

  const invitedById = await resolveReferrer(league.id, referralCode);

  const { rewardGranted } = await prisma.$transaction(async (tx) => {
    const membership = await tx.leagueMembership.create({
      data: { leagueId: league.id, userId: newUserId, invitedById },
    });
    if (!invitedById) return { rewardGranted: false };
    const granted = await grantReferralReward(tx, {
      membershipId: membership.id,
      referrerId: invitedById,
      newUserId,
    });
    return { rewardGranted: granted };
  });

  if (rewardGranted && invitedById) {
    const newUser = await prisma.user.findUnique({ where: { id: newUserId }, select: { displayName: true } });
    await sendPushToUsers([invitedById], {
      title: "🎉 Davetin işe yaradı!",
      body: `${newUser?.displayName ?? "Bir taraftar"} senin davetinle katıldı — ikinize de ${formatTL(
        REFERRAL_BONUS
      )} bakiye eklendi.`,
      data: { type: "league_joined", leagueId: league.id },
    });
  }

  return { ok: true, leagueId: league.id, rewardGranted };
}

export type LeaguePreview = {
  name: string;
  memberCount: number;
  // First few members, oldest-joined first, so an unauthenticated visitor
  // landing on a share link sees who's actually in it before deciding to
  // sign up — no email, no balance, nothing beyond what's already public
  // inside the app to any other member.
  sampleMembers: { displayName: string; favoriteTeam: string | null }[];
};

const PREVIEW_SAMPLE_SIZE = 3;

// Public, unauthenticated lookup for the web smart-link landing page
// (app/lig/[code]) — deliberately a much narrower cut of League than
// getLeagueDetail, since this runs before the visitor has any account at all.
export async function getLeaguePreview(inviteCode: string): Promise<LeaguePreview | null> {
  const league = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    select: {
      name: true,
      _count: { select: { members: true } },
      members: {
        select: { user: { select: { displayName: true, favoriteTeam: true } } },
        orderBy: { joinedAt: "asc" },
        take: PREVIEW_SAMPLE_SIZE,
      },
    },
  });
  if (!league) return null;

  return {
    name: league.name,
    memberCount: league._count.members,
    sampleMembers: league.members.map((m) => m.user),
  };
}

export type MyLeague = { id: string; name: string; inviteCode: string; memberCount: number; isOwner: boolean };

export async function getMyLeagues(userId: string): Promise<MyLeague[]> {
  const memberships = await prisma.leagueMembership.findMany({
    where: { userId },
    select: {
      league: {
        select: { id: true, name: true, inviteCode: true, ownerId: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.league.id,
    name: m.league.name,
    inviteCode: m.league.inviteCode,
    memberCount: m.league._count.members,
    isOwner: m.league.ownerId === userId,
  }));
}

export type LeagueDetail = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  week: LeaderboardScope;
  season: LeaderboardScope;
};

export type LeagueActionResult = { ok: true } | { ok: false; error: string };

// Any non-owner member can leave any time. The owner can't — the league
// needs someone in charge, and "leave" isn't the tool for stepping down;
// deleteLeague is (below). Deleting your own membership when you're the
// owner would silently orphan the league (still listed to everyone else,
// admin-less), which is worse than just refusing the action outright.
export async function leaveLeague(userId: string, leagueId: string): Promise<LeagueActionResult> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) return { ok: false, error: "Lig bulunamadı." };
  if (league.ownerId === userId) {
    return { ok: false, error: "Lig sahibi ayrılamaz — ligi silebilirsin." };
  }

  await prisma.leagueMembership.deleteMany({ where: { leagueId, userId } });
  return { ok: true };
}

// Owner-only: removes another member. Can't target the owner themselves
// (that's not a real action — nothing to kick them from) or a non-member
// (nothing to do).
export async function kickMember(ownerId: string, leagueId: string, targetUserId: string): Promise<LeagueActionResult> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) return { ok: false, error: "Lig bulunamadı." };
  if (league.ownerId !== ownerId) return { ok: false, error: "Bu işlem için lig sahibi olmalısın." };
  if (targetUserId === ownerId) return { ok: false, error: "Kendini atamazsın." };

  const removed = await prisma.leagueMembership.deleteMany({ where: { leagueId, userId: targetUserId } });
  if (removed.count === 0) return { ok: false, error: "Bu kullanıcı ligin üyesi değil." };
  return { ok: true };
}

// Owner-only: deletes the league outright. LeagueMembership rows cascade
// (schema's onDelete: Cascade), so this is the one-step way to close a
// league down — no separate "empty it out first" step needed.
export async function deleteLeague(ownerId: string, leagueId: string): Promise<LeagueActionResult> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) return { ok: false, error: "Lig bulunamadı." };
  if (league.ownerId !== ownerId) return { ok: false, error: "Bu işlem için lig sahibi olmalısın." };

  await prisma.league.delete({ where: { id: leagueId } });
  return { ok: true };
}

// Returns null if the league doesn't exist or the caller isn't a member —
// callers treat that the same way (404), a league's roster/board is only
// visible to people already in it.
export async function getLeagueDetail(leagueId: string, userId: string): Promise<LeagueDetail | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      ownerId: true,
      members: { select: { userId: true } },
    },
  });
  if (!league) return null;

  const memberIds = league.members.map((m) => m.userId);
  if (!memberIds.includes(userId)) return null;

  const { week, season } = await getLeaderboard(userId, new Date(), memberIds);

  return {
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    memberCount: memberIds.length,
    isOwner: league.ownerId === userId,
    week,
    season,
  };
}
