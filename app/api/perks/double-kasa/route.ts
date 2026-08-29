import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { activateDoubleKasa } from "@/lib/perks";

// Boosts the caller's *current* week's kasa to ₺2.000 — once per season.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const result = await activateDoubleKasa(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
