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
  status: string;
  hasOpenPrediction: boolean;
};
