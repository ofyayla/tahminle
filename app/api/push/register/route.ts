import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(["ios", "android"]),
});

// The app calls this after every successful login and on each cold start.
// Re-registering an existing token re-points it at the current user, which is
// what should happen when two people share a phone: the notifications follow
// whoever is actually signed in.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz bildirim anahtarı." }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform },
  });

  return NextResponse.json({ ok: true });
}

// Called on logout so the device stops receiving the previous user's
// notifications. Scoped to the caller's own tokens.
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json({ error: "Geçersiz bildirim anahtarı." }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({ where: { token, userId } });

  return NextResponse.json({ ok: true });
}
