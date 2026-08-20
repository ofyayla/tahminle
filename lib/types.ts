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
  hasOpenPrediction: boolean;
  predictedMarket: "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA" | null;
  predictedChoice: string | null;
  pulse: { total: number; home: number; draw: number; away: number };
};
