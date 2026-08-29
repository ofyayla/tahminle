import { NextResponse } from "next/server";
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
    },
    // Header widgets show this week's standing — the default, most-current tab.
    rank: week.you?.rank ?? null,
    totalPlayers: week.totalPlayers,
  });
}
