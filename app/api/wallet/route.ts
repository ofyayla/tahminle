import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getRecentActivity, getWalletSummary, syncMatchState } from "@/lib/data";
import { prisma } from "@/lib/prisma";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  await syncMatchState();

  const [user, wallet, activity] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getWalletSummary(userId),
    getRecentActivity(userId),
  ]);

  return NextResponse.json({
    wallet,
    startBalance: user.startBalance,
    activity: activity.map((a) => ({ ...a, at: a.at.toISOString() })),
  });
}
