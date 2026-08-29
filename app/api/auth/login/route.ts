import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bilgiler geçersiz." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "E-posta veya şifre hatalı." },
      { status: 401 }
    );
  }

  // An account created through Google/Apple has no password hash at all.
  // Say so plainly rather than returning "wrong password" — the user would
  // otherwise keep retrying a password that never existed.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Bu hesap Google veya Apple ile açılmış. O seçenekle giriş yap." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "E-posta veya şifre hatalı." },
      { status: 401 }
    );
  }

  const token = await createSession(user.id);
  return NextResponse.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
}
