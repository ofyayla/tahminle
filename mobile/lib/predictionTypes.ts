export type PredictionDTO = {
  id: string;
  market: "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA";
  choice: string;
  stake: number;
  oddsAtPick: number;
  status: "open" | "won" | "lost";
  payout: number | null;
  createdAt: string;
  settledAt: string | null;
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    status: string;
    result: string | null;
    resultOver25: boolean | null;
    resultBtts: boolean | null;
    homeScore: number | null;
    awayScore: number | null;
  };
};
