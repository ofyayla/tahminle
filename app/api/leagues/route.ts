import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { createLeague, getMyLeagues } from "@/lib/leagues";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const leagues = await getMyLeagues(userId);
  return NextResponse.json({ leagues });
}

const schema = z.object({ name: z.string().min(2).max(40) });

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lig adı 2-40 karakter arasında olmalı." }, { status: 400 });
  }

  const result = await createLeague(userId, parsed.data.name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, leagueId: result.leagueId, inviteCode: result.inviteCode });
}
