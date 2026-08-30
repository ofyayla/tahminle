import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [user, { week }] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getLeaderboard(userId),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      favoriteTeam: user.favoriteTeam,
      balance: user.balance,
      startBalance: user.startBalance,
      createdAt: user.createdAt.toISOString(),
      // The client never sees passwordHash itself — just whether one exists,
      // so it knows whether to show a password-change form (OAuth-only
      // accounts have none).
      hasPassword: user.passwordHash != null,
    },
    // Header widgets show this week's standing — the default, most-current tab.
    rank: week.you?.rank ?? null,
    totalPlayers: week.totalPlayers,
  });
}

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
});

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Kullanıcı adı 2-40 karakter olmalı." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { displayName: parsed.data.displayName },
  });

  return NextResponse.json({ ok: true, displayName: user.displayName });
}
