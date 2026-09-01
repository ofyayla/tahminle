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

// A fixture can move further than FIXTURE_WINDOW_MS and still be the *same*
// match: the Süper Lig routinely shifts a game between the day it was first
// listed on and the day it is actually played (e.g. Başakşehir–Galatasaray
// first bulletined for a Sunday, then brought forward to the Friday — ~46h).
// buildMatchKey embeds the calendar day, so a move like that mints a brand-new
// externalId, and the tight window above then fails to reconcile it against
// the old row, leaving two rows for one fixture. In this wider window we only
// treat it as a reschedule when we are confident it is one and not two
// distinct games: exact same competition, and the home/away orientation
// unchanged (a reschedule never swaps sides, but a cup tie vs the same
// opponent a few days from a league meeting could otherwise be folded in).
const RESCHEDULE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

// Same competition after folding accents and the rotating sponsor prefix, so
// Nesine's "Süper Lig" and the backend's "Trendyol Süper Lig" count as equal
// while "UEFA Şampiyonlar Ligi" stays distinct from either.
function isSameCompetition(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return foldTr(a) === foldTr(b);
}

// Whether two {homeTeam, awayTeam, kickoff} records plausibly describe the
// same real-world fixture, tolerating providers who spell one side's club
// differently (e.g. "Erzurumspor FK" vs "Erzurum BB"), who occasionally swap
// which side is listed as home/away, and who disagree on the kickoff day
// because the fixture was rescheduled.
//
// BOTH sides must correspond — matching on just one shared name is not
// enough. GS/FB/BJK play multiple different fixtures within any given
// 36-hour window across a season (e.g. a European away leg Thursday, a
// league match Saturday); requiring only one side to match previously
// treated those as the *same* fixture purely because the tracked club's
// name appeared in both, silently overwriting one match's row (and its
// already-placed predictions) with the other's data.
export function isSameFixture(
  a: { homeTeam: string; awayTeam: string; kickoff: Date; league?: string | null },
  b: { homeTeam: string; awayTeam: string; kickoff: Date; league?: string | null }
): boolean {
  const gap = Math.abs(a.kickoff.getTime() - b.kickoff.getTime());
  if (gap > RESCHEDULE_WINDOW_MS) return false;

  const straight = isSameTeamName(a.homeTeam, b.homeTeam) && isSameTeamName(a.awayTeam, b.awayTeam);
  const swapped = isSameTeamName(a.homeTeam, b.awayTeam) && isSameTeamName(a.awayTeam, b.homeTeam);

  if (gap <= FIXTURE_WINDOW_MS) return straight || swapped;

  // Beyond the tight window, only a confident same-competition, same-
  // orientation match is a reschedule of one fixture rather than two fixtures.
  return straight && isSameCompetition(a.league, b.league);
}
