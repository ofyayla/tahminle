import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getLeagueDetail } from "@/lib/leagues";

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
