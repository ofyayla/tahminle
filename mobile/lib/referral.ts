import { API_BASE_URL } from "./config";

// The one link every invite flow in the app builds and shares — a plain
// https URL (not the tahminle:// scheme) so it works everywhere a link can
// land: WhatsApp, SMS, a screenshot caption. app/lig/[code] on the backend
// (the same Next.js app that serves the API) is the "smart link" landing
// page: if the app is installed it hands off to it via the custom scheme,
// otherwise it shows a preview of the league and a way to get the app.
export function inviteLink(inviteCode: string, referralCode: string | null | undefined): string {
  const base = `${API_BASE_URL}/lig/${inviteCode}`;
  return referralCode ? `${base}?ref=${referralCode}` : base;
}

export function inviteMessage(leagueName: string, link: string): string {
  return `Seni "${leagueName}" Taraftar Ligi'ne çağırıyorum ⚽️\nAynı kasa, aynı kurallar — bakalım kim daha iyi tahmin ediyor.\n\n${link}`;
}

// Someone joining an existing session (not through the deep-linked register
// screen) may paste the whole share link into the "davet koduyla katıl"
// field instead of typing the bare code — this pulls the code (and ref, if
// present) back out of either shape rather than making that fail.
export function parseInviteInput(raw: string): { code: string; ref: string | null } {
  const trimmed = raw.trim();
  if (/^([a-z]+:)?\/\//i.test(trimmed) || trimmed.includes("://")) {
    try {
      const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
      const segments = url.pathname.split("/").filter(Boolean);
      const code = segments[segments.length - 1] ?? "";
      return { code: code.toUpperCase(), ref: url.searchParams.get("ref") };
    } catch {
      // Not actually a parseable URL despite looking like one — fall through
      // and treat it as a plain code below.
    }
  }
  return { code: trimmed.toUpperCase(), ref: null };
}
