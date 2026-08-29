import { NextRequest, NextResponse } from "next/server";
import { syncMatchState } from "@/lib/data";
import { refreshAiAnalyses } from "@/lib/aiAnalysis";
import { notifyStartingSoon } from "@/lib/reminders";

// Runs on a schedule (driven by an external cron service) so no user request
// ever pays the ~15s cost of a cold headless-browser scrape
// (lib/liveScoreScraper.ts) or the several seconds an AI match note takes.
// Page loads still fall back to scraping inline for a match this hasn't
// caught up with yet.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // syncMatchState() sends the goal and settlement pushes as a side effect of
  // updating scores — this is the only place that runs often enough for them
  // to be timely.
  await syncMatchState();

  // Kickoff reminders are their own pass: they're about matches that haven't
  // started yet, which settlement never looks at.
  const reminders = await notifyStartingSoon().catch((err) => {
    console.error("Maç hatırlatma bildirimi hatası:", err);
    return 0;
  });

  // One note per tick keeps this well inside the function's time budget;
  // refreshAiAnalyses only picks up matches whose note is missing or stale,
  // so most ticks do nothing here.
  const analyses = await refreshAiAnalyses(1).catch((err) => {
    console.error("AI analiz döngüsü hatası:", err);
    return 0;
  });

  return NextResponse.json({ ok: true, analyses, reminders });
}
