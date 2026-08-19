import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(40),
  favoriteTeam: z.enum(["GS", "FB", "BJK"]).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bilgiler geçersiz. Lütfen tekrar kontrol edin." },
      { status: 400 }
    );
  }

  const { email, password, displayName, favoriteTeam } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta ile zaten bir hesap var." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      favoriteTeam: favoriteTeam ?? null,
      balance: 1000,
      startBalance: 1000,
    },
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
