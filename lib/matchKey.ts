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

const FIXTURE_WINDOW_MS = 36 * 60 * 60 * 1000;

// Whether two {homeTeam, awayTeam, kickoff} records plausibly describe the
// same real-world fixture — only one side needs to match by name (the
// tracked GS/FB/BJK club is named consistently; the opponent isn't), plus a
// generous kickoff window to absorb minor time disagreements between sources.
export function isSameFixture(
  a: { homeTeam: string; awayTeam: string; kickoff: Date },
  b: { homeTeam: string; awayTeam: string; kickoff: Date }
): boolean {
  if (Math.abs(a.kickoff.getTime() - b.kickoff.getTime()) > FIXTURE_WINDOW_MS) return false;
  return (
    isSameTeamName(a.homeTeam, b.homeTeam) ||
    isSameTeamName(a.homeTeam, b.awayTeam) ||
    isSameTeamName(a.awayTeam, b.homeTeam) ||
    isSameTeamName(a.awayTeam, b.awayTeam)
  );
}
