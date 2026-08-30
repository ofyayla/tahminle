import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteLeague, getLeagueDetail } from "@/lib/leagues";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const { id } = await params;
  const league = await getLeagueDetail(id, userId);
  if (!league) {
    return NextResponse.json({ error: "Lig bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ league });
}

// Owner-only: deletes the league outright.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteLeague(userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
