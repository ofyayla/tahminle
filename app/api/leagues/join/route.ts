import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { joinLeague } from "@/lib/leagues";

const schema = z.object({
  code: z.string().min(1).max(20),
  // The joiner's own referral code, when they arrived via a friend's
  // personal share link — recorded for attribution only. No reward fires
  // here: this route is for an already-signed-in account joining another
  // league, not the new-user acquisition path (that's the register route).
  ref: z.string().max(20).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Davet kodu girmelisin." }, { status: 400 });
  }

  const result = await joinLeague(userId, parsed.data.code, parsed.data.ref);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, leagueId: result.leagueId });
}
