import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getRecentActivity } from "@/lib/data";

// Backs the mobile "Tümünü gör" screen — /api/wallet only ever returns a
// 5-item preview, this returns the fuller list.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const activity = await getRecentActivity(userId, 200);
  return NextResponse.json({ activity: activity.map((a) => ({ ...a, at: a.at.toISOString() })) });
}
