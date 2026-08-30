import { NextRequest, NextResponse } from "next/server";
import { getLeaguePreview } from "@/lib/leagues";

// Deliberately unauthenticated — this is what the smart-link landing page
// (app/lig/[code]) and the mobile app's pre-join preview call before the
// visitor has signed in at all. See lib/leagues.ts's getLeaguePreview for
// what it does and doesn't expose.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await getLeaguePreview(code);
  if (!preview) {
    return NextResponse.json({ error: "Bu davet koduyla bir lig bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ league: preview });
}
