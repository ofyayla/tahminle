import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  // Spread the whole leaderboard result rather than picking fields out of it,
  // so anything added to getLeaderboard reaches the mobile client instead of
  // silently going missing from the payload.
  const [leaderboard, feed] = await Promise.all([
    getLeaderboard(userId),
    getCommunityFeed(userId),
  ]);

  return NextResponse.json({ ...leaderboard, feed });
}
