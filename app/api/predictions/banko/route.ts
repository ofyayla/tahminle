import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { BankoLockedError, clearWeeklyBanko, setWeeklyBanko } from "@/lib/banko";

const schema = z.object({ predictionId: z.string() });

// Marks an already-open prediction as this week's Banko, moving it off
// whatever was previously marked (if that one hasn't kicked off yet).
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    await prisma.$transaction((tx) => setWeeklyBanko(tx, userId, parsed.data.predictionId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankoLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

// Unmarks the current week's Banko (if it hasn't kicked off yet).
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    await prisma.$transaction((tx) => clearWeeklyBanko(tx, userId, parsed.data.predictionId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankoLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
