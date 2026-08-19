import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const schema = z.object({ favoriteTeam: z.enum(["GS", "FB", "BJK"]).nullable() });

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

  await prisma.user.update({
    where: { id: userId },
    data: { favoriteTeam: parsed.data.favoriteTeam },
  });

  return NextResponse.json({ ok: true });
}
