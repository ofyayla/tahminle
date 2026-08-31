import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tahminle_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me-tahminle-app-2026"
);

// Logged-out only — an authenticated visitor is bounced home from these
// (see the `authed && isPublic` branch below).
const PUBLIC_PATHS = ["/login", "/register"];
// The friend-league smart-link landing page (app/lig/[code]) — unlike the
// paths above, this has to render for BOTH auth states: a share link is as
// likely to land on someone already signed in on the web (who should get a
// straight "join" option, handled client-side) as on a stranger with no
// account yet. So it skips the redirect logic entirely rather than joining
// PUBLIC_PATHS, which would otherwise bounce a signed-in visitor straight
// back to "/" before they ever see it. Prefix match since the code varies
// per league.
//
// The privacy policy joins it for the same reason: Google Play's store
// listing points at /gizlilik-politikasi and a reviewer (or anyone already
// signed in who taps the link from inside the app) must land on the text
// itself, never on a redirect.
const OPEN_PREFIXES = ["/lig/", "/gizlilik-politikasi"];

async function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(req);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!authed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|teams/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
