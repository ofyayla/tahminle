import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getUserPerkStatus } from "@/lib/perks";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const status = await getUserPerkStatus(userId);
  return NextResponse.json(status);
}
