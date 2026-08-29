import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { OAuthError, verifyIdentityToken } from "@/lib/oauth";
import { STARTING_BALANCE, seasonStartFor, weekStartFor } from "@/lib/season";

const schema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1),
  // Apple only reveals the user's name on the very first authorisation, and
  // only to the client — so the app forwards it here. Treated as a display
  // hint, never as identity.
  fullName: z.string().min(1).max(40).optional().nullable(),
});

// Turns an email into a display name for providers that give us nothing
// better ("omer.yayla@gmail.com" -> "omer.yayla").
function nameFromEmail(email: string): string {
  return email.split("@")[0].slice(0, 40) || "Taraftar";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz giriş bilgisi." }, { status: 400 });
  }

  const { provider, idToken, fullName } = parsed.data;

  let identity;
  try {
    identity = await verifyIdentityToken(provider, idToken);
  } catch (err) {
    const message = err instanceof OAuthError ? err.message : "Giriş doğrulanamadı.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  // 1. Already linked — straight in.
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      },
    },
    select: { user: true },
  });

  if (existingLink) {
    const token = await createSession(existingLink.user.id);
    return NextResponse.json({
      ok: true,
      token,
      isNewUser: false,
      needsTeam: existingLink.user.favoriteTeam == null,
      user: publicUser(existingLink.user),
    });
  }

  // 2. Not linked yet. If the provider vouches for an email we already have
  //    an account for, link to it instead of creating a duplicate — signing
  //    in with Google after registering with a password should land on the
  //    same account.
  //
  //    The verified-email check matters: without it, anyone able to mint a
  //    token carrying someone else's unverified address could take over that
  //    account. Apple's private-relay addresses are always verified.
  if (identity.email && identity.emailVerified) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      await prisma.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      });
      const token = await createSession(byEmail.id);
      return NextResponse.json({
        ok: true,
        token,
        isNewUser: false,
        needsTeam: byEmail.favoriteTeam == null,
        user: publicUser(byEmail),
      });
    }
  }

  // 3. Brand new account. An email is required — it's the account's identity
  //    everywhere else in the app, and the schema keeps it unique.
  if (!identity.email) {
    return NextResponse.json(
      { error: "Bu hesaptan e-posta alınamadı. Lütfen e-posta paylaşımına izin ver." },
      { status: 400 }
    );
  }

  const displayName = fullName?.trim() || identity.name?.trim() || nameFromEmail(identity.email);

  const now = new Date();
  const created = await prisma.user.create({
    data: {
      email: identity.email,
      // No password: this account can only ever be reached through its
      // provider. lib/auth's password path rejects a null hash.
      passwordHash: null,
      displayName,
      favoriteTeam: null,
      balance: STARTING_BALANCE,
      startBalance: STARTING_BALANCE,
      // Stamped at creation so applyPeriodicAdjustments doesn't mistake a
      // brand-new account for one "overdue" for a reset/top-up.
      weekAnchor: weekStartFor(now),
      seasonAnchor: seasonStartFor(now),
      oauthAccounts: {
        create: { provider: identity.provider, providerUserId: identity.providerUserId },
      },
    },
  });

  const token = await createSession(created.id);
  return NextResponse.json({
    ok: true,
    token,
    isNewUser: true,
    // New accounts have no club yet — the app sends them through the
    // one-time team picker before the tabs.
    needsTeam: true,
    user: publicUser(created),
  });
}

function publicUser(u: { id: string; email: string; displayName: string }) {
  return { id: u.id, email: u.email, displayName: u.displayName };
}
