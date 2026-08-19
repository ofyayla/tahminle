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

type BackendOdd = { bookmaker: string; home_win: number; draw: number; away_win: number };
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
};

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

  return data.data
    .map((m) => {
      const primary = m.odds[0];
      if (!primary) return null;
      return {
        externalId: `backend:${m.id}`,
        homeTeam: normalizeTeamName(m.home_team),
        awayTeam: normalizeTeamName(m.away_team),
        league: m.league,
        kickoff: new Date(m.kickoff_time),
        oddsHome: primary.home_win,
        oddsDraw: primary.draw,
        oddsAway: primary.away_win,
      };
    })
    .filter((m): m is BackendOddsMatch => m !== null);
}
