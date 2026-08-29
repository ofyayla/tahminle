import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies the identity tokens Google and Apple hand the mobile app.
//
// This has to happen on the server. The client could send us any email it
// likes; what makes the claim trustworthy is that the token is signed by the
// provider and issued *to our app* — so both the signature and the `aud`
// claim are checked here. Never trust a provider profile the client parsed
// itself.

export type OAuthProvider = "google" | "apple";

export type VerifiedIdentity = {
  provider: OAuthProvider;
  // The provider's stable subject id. Unlike an email, this never moves
  // between people, so it's what accounts are keyed on.
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Google issues a different client id per platform (iOS, Android, web), and
// the token's `aud` is whichever one requested it — so every id our app can
// present has to be accepted.
function googleAudiences(): string[] {
  return envList("GOOGLE_OAUTH_CLIENT_IDS");
}

// For a natively-signed Apple token the audience is the app's bundle id.
function appleAudiences(): string[] {
  return envList("APPLE_OAUTH_CLIENT_IDS");
}

export class OAuthError extends Error {}

async function verifyGoogle(idToken: string): Promise<VerifiedIdentity> {
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new OAuthError("Google girişi bu sunucuda yapılandırılmamış.");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: audiences,
  });

  if (!payload.sub) throw new OAuthError("Google kimliği doğrulanamadı.");

  return {
    provider: "google",
    providerUserId: payload.sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
    // Google sends this as a boolean or the string "true" depending on flow.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

async function verifyApple(idToken: string): Promise<VerifiedIdentity> {
  const audiences = appleAudiences();
  if (audiences.length === 0) {
    throw new OAuthError("Apple girişi bu sunucuda yapılandırılmamış.");
  }

  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: audiences,
  });

  if (!payload.sub) throw new OAuthError("Apple kimliği doğrulanamadı.");

  return {
    provider: "apple",
    providerUserId: payload.sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    // Apple never puts a name in the token — it's handed to the client once,
    // on the very first authorisation, and the client forwards it separately.
    name: null,
  };
}

export async function verifyIdentityToken(
  provider: OAuthProvider,
  idToken: string
): Promise<VerifiedIdentity> {
  try {
    return provider === "google" ? await verifyGoogle(idToken) : await verifyApple(idToken);
  } catch (err) {
    if (err instanceof OAuthError) throw err;
    // Signature, expiry, issuer and audience failures all land here. The
    // reason isn't safe to echo back to the client.
    console.error(`${provider} kimlik doğrulama hatası:`, err);
    throw new OAuthError("Giriş doğrulanamadı. Lütfen tekrar dene.");
  }
}
