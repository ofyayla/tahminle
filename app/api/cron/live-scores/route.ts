import { NextRequest, NextResponse } from "next/server";
import { syncMatchState } from "@/lib/data";

// Runs on a schedule (see vercel.json) so no user request ever pays the
// ~15s cost of a cold headless-browser scrape (lib/liveScoreScraper.ts) —
// this keeps live scores fresh in the background; page loads still fall
// back to scraping inline for a match this hasn't caught up with yet.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncMatchState();
  return NextResponse.json({ ok: true });
}
