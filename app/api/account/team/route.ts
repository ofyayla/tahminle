import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const schema = z.object({ favoriteTeam: z.enum(["GS", "FB", "BJK"]) });

// Set-once. A club is picked at sign-up and then fixed — but accounts created
// through Google/Apple never went through the registration form, so they
// arrive with no club and need exactly one chance to choose.
//
// Enforced with a conditional updateMany (`favoriteTeam: null`) rather than a
// read-then-write, so two racing requests can't both pass the check: only the
// one that actually flips the column reports success.
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz takım." }, { status: 400 });
  }

  const claimed = await prisma.user.updateMany({
    where: { id: userId, favoriteTeam: null },
    data: { favoriteTeam: parsed.data.favoriteTeam },
  });

  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "Takımın zaten seçili ve sonradan değiştirilemez." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
