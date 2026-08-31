import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearSession, getSessionUserId } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";
import { getLeaderboard } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [user, { week }] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getLeaderboard(userId),
  ]);

  // A session token outliving its user is a real case now that accounts can
  // be deleted: the JWT stays signature-valid for 30 days, so a client that
  // deleted from another device — or the web — still presents a token naming
  // a row that is gone. findUniqueOrThrow turned that into a 500, which the
  // Expo client does not treat as a sign-out (auth-context only clears the
  // session on 401), leaving the app wedged as "logged in" with every
  // request failing. Answering 401 lets it log itself out cleanly.
  if (!user) {
    return NextResponse.json({ error: "Oturumun geçersiz, tekrar giriş yap." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      favoriteTeam: user.favoriteTeam,
      balance: user.balance,
      startBalance: user.startBalance,
      createdAt: user.createdAt.toISOString(),
      referralCode: user.referralCode,
      // The client never sees passwordHash itself — just whether one exists,
      // so it knows whether to show a password-change form (OAuth-only
      // accounts have none).
      hasPassword: user.passwordHash != null,
    },
    // Header widgets show this week's standing — the default, most-current tab.
    rank: week.you?.rank ?? null,
    totalPlayers: week.totalPlayers,
  });
}

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
});

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Kullanıcı adı 2-40 karakter olmalı." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { displayName: parsed.data.displayName },
  });

  return NextResponse.json({ ok: true, displayName: user.displayName });
}

// Confirmation is the account's own display name, typed back. A password
// check would be the obvious choice but it can't be the only one — accounts
// created through Google/Apple have no password at all (User.passwordHash is
// nullable), and those users must be able to delete themselves too. Echoing
// the display name works identically for both kinds and still can't be
// triggered by an accidental tap.
const deleteSchema = z.object({
  confirm: z.string(),
});

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Onay metni eksik." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });
  }

  if (parsed.data.confirm.trim() !== user.displayName) {
    return NextResponse.json(
      { error: "Onay için kullanıcı adını birebir yazmalısın." },
      { status: 400 }
    );
  }

  const result = await deleteAccount(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Web clients carry the session in a cookie, so it has to be dropped here
  // or the next request arrives with a token naming a user that no longer
  // exists. Native clients hold theirs in SecureStore and clear it their own
  // side; this is a harmless no-op for them.
  await clearSession();

  return NextResponse.json({ ok: true });
}
