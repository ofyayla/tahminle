import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  // Spread the whole leaderboard result rather than picking fields out of it:
  // destructuring here is how `seasonStart`/`seasonEnd` silently went missing
  // from the mobile client's payload when they were added to getLeaderboard.
  const [leaderboard, feed] = await Promise.all([
    getLeaderboard(userId),
    getCommunityFeed(userId),
  ]);

  return NextResponse.json({ ...leaderboard, feed });
}
