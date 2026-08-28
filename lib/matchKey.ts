// Common Süper Lig sponsorship prefixes that different odds providers do or
// don't include (e.g. "Torku Konyaspor" vs plain "Konyaspor"). Stripped only
// for key-building, never for the display name.
const SPONSOR_PREFIXES = [
  "torku", "trendyol", "zorlu", "corendon", "sinerji", "a101", "beko",
  "ziraat", "sompo", "hes", "e2elektronik",
];

function foldTr(s: string): string {
  let out = s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  for (const prefix of SPONSOR_PREFIXES) {
    if (out.startsWith(`${prefix} `)) {
      out = out.slice(prefix.length + 1);
      break;
    }
  }

  return out.replace(/\s+/g, "");
}

// A stable identity for a fixture, independent of which odds provider (or
// which of its internal ids) supplied this particular scrape. Keying by
// provider id instead caused the same real-world match to be stored as
// multiple rows whenever the source flipped between the hybrid backend and
// the Nesine fallback, or between the backend's own internal sub-sources.
export function buildMatchKey(homeTeam: string, awayTeam: string, kickoff: Date): string {
  const day = kickoff.toISOString().slice(0, 10);
  return `match:${foldTr(homeTeam)}_${foldTr(awayTeam)}_${day}`;
}

// Even after folding accents/sponsors, two providers can spell the same club
// differently enough that the exact key above still diverges — e.g. Nesine's
// "Erzurumspor FK" vs The-Odds-API's "Erzurum BB" for the same club. This is
// the same fixture-identity question `buildMatchKey` answers, but as a fuzzy
// comparison usable when an exact key lookup misses, so a match doesn't get
// duplicated just because the source renamed its opponent mid-lifecycle.
export function isSameTeamName(a: string, b: string): boolean {
  const fa = foldTr(a);
  const fb = foldTr(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const shorter = fa.length <= fb.length ? fa : fb;
  const longer = fa.length <= fb.length ? fb : fa;
  return shorter.length >= 4 && longer.includes(shorter);
}

// Esports/virtual football fixtures (FIFA/eFootball-style) get listed under
// real club names with a player codename appended in parentheses — e.g.
// "Feyenoord Rotterdam (Tiago)", "Club Brugge (Voodoo)" — often in rapid
// clusters of matches minutes apart. They pass the GS/FB/BJK name filter
// just like a real fixture, and their `league` is frequently mislabeled with
// the same generic fallback used for real UEFA matches, so team-name shape
// is the only reliable signal to exclude them by.
export function isVirtualFixture(homeTeam: string, awayTeam: string): boolean {
  return /\([^)]+\)/.test(homeTeam) || /\([^)]+\)/.test(awayTeam);
}

const FIXTURE_WINDOW_MS = 36 * 60 * 60 * 1000;

// Whether two {homeTeam, awayTeam, kickoff} records plausibly describe the
// same real-world fixture, tolerating providers who spell one side's club
// differently (e.g. "Erzurumspor FK" vs "Erzurum BB") and who occasionally
// swap which side is listed as home/away.
//
// BOTH sides must correspond — matching on just one shared name is not
// enough. GS/FB/BJK play multiple different fixtures within any given
// 36-hour window across a season (e.g. a European away leg Thursday, a
// league match Saturday); requiring only one side to match previously
// treated those as the *same* fixture purely because the tracked club's
// name appeared in both, silently overwriting one match's row (and its
// already-placed predictions) with the other's data.
export function isSameFixture(
  a: { homeTeam: string; awayTeam: string; kickoff: Date },
  b: { homeTeam: string; awayTeam: string; kickoff: Date }
): boolean {
  if (Math.abs(a.kickoff.getTime() - b.kickoff.getTime()) > FIXTURE_WINDOW_MS) return false;
  const straight = isSameTeamName(a.homeTeam, b.homeTeam) && isSameTeamName(a.awayTeam, b.awayTeam);
  const swapped = isSameTeamName(a.homeTeam, b.awayTeam) && isSameTeamName(a.awayTeam, b.homeTeam);
  return straight || swapped;
}
