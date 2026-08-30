export type PredictionDTO = {
  id: string;
  market: "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA";
  choice: string;
  stake: number;
  oddsAtPick: number;
  status: "open" | "won" | "lost" | "cancelled";
  payout: number | null;
  // This week's captain call — a won Banko pays double. Set at creation or
  // via PATCH /api/predictions/banko, at most one true per user per week.
  isBanko: boolean;
  // Set by settlement when a "lost" pick was covered by the sigorta joker —
  // the stake was refunded (payout = stake) even though the call was wrong.
  wasInsured: boolean;
  createdAt: string;
  settledAt: string | null;
  match: {
    id: string;
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
