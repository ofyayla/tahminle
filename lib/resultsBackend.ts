import { isSameFixture } from "./matchKey";

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

// Finds the real result for one of our stored matches, tolerating the
// team-naming and kickoff-time drift between odds providers.
export function findRealResult(
  match: { homeTeam: string; awayTeam: string; kickoff: Date },
  results: RealMatchResult[]
): RealMatchResult | null {
  return results.find((r) => isSameFixture(match, r)) ?? null;
}
