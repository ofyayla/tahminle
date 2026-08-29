import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  return NextResponse.json({ items: await getNotifications(userId) });
}
