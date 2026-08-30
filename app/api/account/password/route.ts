import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Yeni şifre en az 6 karakter olmalı." }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // OAuth-only accounts have no passwordHash to check against — anyone who
  // already holds a valid session for the account may set an initial one
  // without proving a "current" password that never existed.
  if (user.passwordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Mevcut şifreni gir." }, { status: 400 });
    }
    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
