import { prisma } from "./prisma";
import { getLeaderboard, type LeaderboardScope } from "./data";

export type LeagueResult = { ok: true; leagueId: string; inviteCode: string } | { ok: false; error: string };
export type JoinResult = { ok: true; leagueId: string } | { ok: false; error: string };

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

export async function joinLeague(userId: string, inviteCode: string): Promise<JoinResult> {
  const league = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    select: { id: true },
  });
  if (!league) {
    return { ok: false, error: "Bu davet koduyla bir lig bulunamadı." };
  }

  try {
    await prisma.leagueMembership.create({ data: { leagueId: league.id, userId } });
    return { ok: true, leagueId: league.id };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: true, leagueId: league.id }; // already a member — join is idempotent from the user's view
    }
    throw err;
  }
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
