import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { STARTING_BALANCE, seasonStartFor, weekStartFor } from "@/lib/season";
import { generateUniqueReferralCode } from "@/lib/referrals";
import { joinLeagueForNewUser } from "@/lib/leagues";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(40),
  favoriteTeam: z.enum(["GS", "FB", "BJK", "TS"]).nullable().optional(),
  // Present when registration was reached through a friend-league share link
  // (the web smart-link page, or the mobile app's deep-linked register
  // screen). `inviteCode` is the league's own code; `ref` is the specific
  // member's personal referral code, used to credit the reward correctly —
  // see lib/leagues.ts's joinLeagueForNewUser.
  inviteCode: z.string().max(20).optional().nullable(),
  ref: z.string().max(20).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bilgiler geçersiz. Lütfen tekrar kontrol edin." },
      { status: 400 }
    );
  }

  const { email, password, displayName, favoriteTeam, inviteCode, ref } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta ile zaten bir hesap var." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      favoriteTeam: favoriteTeam ?? null,
      balance: STARTING_BALANCE,
      startBalance: STARTING_BALANCE,
      // Stamped at creation so applyPeriodicAdjustments doesn't mistake a
      // brand-new account for one "overdue" for a reset/top-up.
      weekAnchor: weekStartFor(now),
      seasonAnchor: seasonStartFor(now),
      referralCode: await generateUniqueReferralCode(),
    },
  });

  const token = await createSession(user.id);

  // A bad/expired invite code must never take the whole signup down with it
  // — it just means this new account doesn't land in a league yet.
  let leagueJoined: { leagueId: string; rewardGranted: boolean } | null = null;
  if (inviteCode?.trim()) {
    const joinResult = await joinLeagueForNewUser(user.id, inviteCode, ref).catch(() => null);
    if (joinResult?.ok) {
      leagueJoined = { leagueId: joinResult.leagueId, rewardGranted: joinResult.rewardGranted };
    }
  }

  return NextResponse.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
    leagueJoined,
  });
}
