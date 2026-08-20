import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "tahminle_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me-tahminle-app-2026"
);

// Native clients (Expo app) have no cookie jar tied to this origin, so they
// authenticate with `Authorization: Bearer <token>` instead. The token is the
// same signed JWT the web session cookie carries.
async function signSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function createSession(userId: string) {
  const token = await signSessionToken(userId);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return token;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  let token = store.get(COOKIE_NAME)?.value;

  if (!token) {
    const headerList = await headers();
    const auth = headerList.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      token = auth.slice("Bearer ".length);
    }
  }

  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.userId as string) ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
