export type MatchDTO = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string | null;
  kickoff: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  prevOddsHome: number | null;
  prevOddsDraw: number | null;
  prevOddsAway: number | null;
  extraOdds: {
    over25: number | null;
    under25: number | null;
    bttsYes: number | null;
    bttsNo: number | null;
    dc1X: number | null;
    dc12: number | null;
    dcX2: number | null;
    extraMarkets: Record<string, number> | null;
  };
  status: string;
  liveScore: { home: number; away: number } | null;
  // Short AI-written pre-match note, produced in the background by the cron
  // (lib/aiAnalysis.ts). Null until one has been generated for this match.
  aiAnalysis: string | null;
  // Keyed by market ("1X2" | "OU25" | "BTTS" | "DC" | "EXTRA") — a user can
  // hold at most one open prediction per market per match, but different
  // markets on the same match are independent of each other.
  openByMarket: Record<string, string>;
  pulse: { total: number; home: number; draw: number; away: number };
  // Haftalık kasa / tek maç tavanı bu maçın kickoff'una göre hesaplanır —
  // bet slip'in izin verdiği en yüksek stake'i belirler (bkz. lib/season.ts).
  weekBudget: { cap: number; used: number; remaining: number };
  matchBudget: { cap: number; used: number; remaining: number };
};
