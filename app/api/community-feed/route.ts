import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getCommunityFeed } from "@/lib/data";

// Backs the mobile "Tümünü gör" screen — /api/leaderboard only ever returns
// a 5-item preview, this returns the fuller list.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const feed = await getCommunityFeed(userId, 100);
  return NextResponse.json({ feed });
}
