export type PredictionDTO = {
  id: string;
  choice: "1" | "X" | "2";
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
  };
};
