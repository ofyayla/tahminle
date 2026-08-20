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
