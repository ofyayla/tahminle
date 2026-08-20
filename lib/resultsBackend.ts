const BACKEND_BASE_URL = "https://superlig-odds-backend.vercel.app";

type BackendResult = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  completed: boolean;
  home_score: number | null;
  away_score: number | null;
  winner: "1" | "X" | "2" | null;
};
type BackendResultsResponse = { success: boolean; data: BackendResult[] };

export type RealMatchResult = {
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
  winner: "1" | "X" | "2" | null;
};

export async function fetchRealResults(): Promise<RealMatchResult[]> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/v1/results`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Sonuç backend'i hata döndü: ${res.status}`);

  const data: BackendResultsResponse = await res.json();
  if (!data.success) throw new Error("Sonuç backend'i başarısız yanıt döndü.");

  return data.data.map((r) => ({
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    kickoff: new Date(r.kickoff_time),
    completed: r.completed,
    homeScore: r.home_score,
    awayScore: r.away_score,
    winner: r.winner,
  }));
}

function foldTr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

// Names for the same club can differ meaningfully between Nesine (our
// primary odds source) and The-Odds-API (our results source) — e.g.
// "Erzurumspor FK" vs "Erzurum BB" — so exact/folded equality isn't enough.
// Fall back to substring overlap in either direction, same technique the
// backend's own hybrid aggregator uses to de-dupe across its two sources.
function namesLikelySameTeam(a: string, b: string): boolean {
  const fa = foldTr(a);
  const fb = foldTr(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const shorter = fa.length <= fb.length ? fa : fb;
  const longer = fa.length <= fb.length ? fb : fa;
  return shorter.length >= 4 && longer.includes(shorter);
}

const KICKOFF_WINDOW_MS = 36 * 60 * 60 * 1000;

// Finds the real result for one of our stored matches, tolerating the
// team-naming and kickoff-time drift between odds providers.
//
// Only one side needs to match: the opponent's name is frequently spelled
// differently between Nesine ("Erzurumspor FK") and The-Odds-API ("Erzurum
// BB"), but the tracked club (GS/FB/BJK) is named consistently by both, and
// combined with a tight kickoff window that's enough to uniquely identify
// the fixture — a tracked team plays at most one match in that window.
export function findRealResult(
  match: { homeTeam: string; awayTeam: string; kickoff: Date },
  results: RealMatchResult[]
): RealMatchResult | null {
  for (const r of results) {
    const timeDiff = Math.abs(r.kickoff.getTime() - match.kickoff.getTime());
    if (timeDiff > KICKOFF_WINDOW_MS) continue;

    const anySideMatches =
      namesLikelySameTeam(match.homeTeam, r.homeTeam) ||
      namesLikelySameTeam(match.homeTeam, r.awayTeam) ||
      namesLikelySameTeam(match.awayTeam, r.homeTeam) ||
      namesLikelySameTeam(match.awayTeam, r.awayTeam);

    if (anySideMatches) return r;
  }
  return null;
}
