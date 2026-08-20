import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [{ ranked, you, totalPlayers }, feed] = await Promise.all([
    getLeaderboard(userId),
    getCommunityFeed(userId),
  ]);

  return NextResponse.json({ ranked, you, totalPlayers, feed });
}
