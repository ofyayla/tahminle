import { buildMatchKey } from "./matchKey";

const BACKEND_BASE_URL = "https://superlig-odds-backend.vercel.app";

const TEAM_ALIASES: Record<string, string> = {
  galatasaray: "Galatasaray",
  fenerbahce: "Fenerbahçe",
  "fenerbahçe": "Fenerbahçe",
  besiktas: "Beşiktaş",
  "beşiktaş": "Beşiktaş",
};

function foldTr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

function normalizeTeamName(name: string): string {
  const folded = foldTr(name);
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (folded.includes(foldTr(alias))) return canonical;
  }
  return name;
}

type BackendOdd = {
  bookmaker: string;
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5?: number | null;
  under_2_5?: number | null;
  btts_yes?: number | null;
  btts_no?: number | null;
  double_chance_1x?: number | null;
  double_chance_12?: number | null;
  double_chance_x2?: number | null;
  extra_markets?: Record<string, number> | null;
};
type BackendMatch = {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  target_teams: string[];
  odds: BackendOdd[];
};
type BackendResponse = { success: boolean; count: number; data: BackendMatch[] };

export type BackendOddsMatch = {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: Date;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
  dc1X: number | null;
  dc12: number | null;
  dcX2: number | null;
  extraMarkets: Record<string, number> | null;
};

// Prefer the bookmaker entry carrying the most detail (usually the Nesine
// entry, which is the only one with extra_markets) over just taking odds[0].
function pickRichestOdd(odds: BackendOdd[]): BackendOdd | undefined {
  return [...odds].sort((a, b) => {
    const score = (o: BackendOdd) =>
      (o.extra_markets ? Object.keys(o.extra_markets).length : 0) +
      (o.over_2_5 != null ? 1 : 0) +
      (o.btts_yes != null ? 1 : 0) +
      (o.double_chance_1x != null ? 1 : 0);
    return score(b) - score(a);
  })[0];
}

export async function fetchOddsFromBackend(): Promise<BackendOddsMatch[]> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/v1/odds`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Odds backend hata döndü: ${res.status}`);
  }

  const data: BackendResponse = await res.json();
  if (!data.success) {
    throw new Error("Odds backend başarısız yanıt döndü.");
  }

  const mapped = data.data
    .map((m) => {
      const primary = pickRichestOdd(m.odds);
      if (!primary) return null;
      const homeTeam = normalizeTeamName(m.home_team);
      const awayTeam = normalizeTeamName(m.away_team);
      const kickoff = new Date(m.kickoff_time);
      return {
        externalId: buildMatchKey(homeTeam, awayTeam, kickoff),
        homeTeam,
        awayTeam,
        league: m.league,
        kickoff,
        oddsHome: primary.home_win,
        oddsDraw: primary.draw,
        oddsAway: primary.away_win,
        over25: primary.over_2_5 ?? null,
        under25: primary.under_2_5 ?? null,
        bttsYes: primary.btts_yes ?? null,
        bttsNo: primary.btts_no ?? null,
        dc1X: primary.double_chance_1x ?? null,
        dc12: primary.double_chance_12 ?? null,
        dcX2: primary.double_chance_x2 ?? null,
        extraMarkets: primary.extra_markets ?? null,
      };
    })
    .filter((m): m is BackendOddsMatch => m !== null);

  // Defensive de-dupe: keep whichever entry per fixture carries more data,
  // in case the backend ever returns the same match under two provider ids.
  const byKey = new Map<string, BackendOddsMatch>();
  for (const m of mapped) {
    const existing = byKey.get(m.externalId);
    if (!existing || Object.keys(m.extraMarkets ?? {}).length > Object.keys(existing.extraMarkets ?? {}).length) {
      byKey.set(m.externalId, m);
    }
  }

  return [...byKey.values()];
}
