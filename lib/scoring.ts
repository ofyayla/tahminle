// Leaderboard scoring.
//
// Ranking used to be raw virtual balance, which mostly measured how much
// someone was willing to stake rather than how well they read a match. Points
// are stake-independent: every settled prediction is worth the same regardless
// of how much was put on it, so a player with a big balance can't buy rank.

// A correct prediction scores its odds × this. Wrong predictions score zero —
// there is no negative scoring, so playing more can never hurt you, it just
// dilutes your accuracy percentage.
export const POINTS_PER_ODDS_UNIT = 10;

// Ceiling on a single prediction's points.
//
// Maç Skoru (EXTRA) is priced at 20-130, so uncapped it would be the only
// rational thing to play: a 7% hit rate on 500 points still beats a coin-flip
// at 20. The cap keeps an exact-score call clearly the most valuable thing on
// the board (100 vs the ~35 a 3.5 pick pays) without turning the whole
// leaderboard into a lottery. Raise or drop this one number to retune.
export const MAX_POINTS_PER_PREDICTION = 100;

export function pointsFor(oddsAtPick: number): number {
  return Math.min(
    Math.round(oddsAtPick * POINTS_PER_ODDS_UNIT),
    MAX_POINTS_PER_PREDICTION
  );
}

// Turkey has not observed daylight saving since 2016 — the offset is a flat
// UTC+3 all year, so the week boundary needs no timezone database.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

// Monday 00:00 Istanbul, as a UTC instant. The season runs Monday-to-Sunday so
// a full match week (Fri-Mon fixtures included) lands inside one season.
export function currentSeasonStart(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const localMidnight =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    daysSinceMonday * 24 * 60 * 60 * 1000;
  return new Date(localMidnight - ISTANBUL_OFFSET_MS);
}

export function currentSeasonEnd(now: Date = new Date()): Date {
  return new Date(currentSeasonStart(now).getTime() + 7 * 24 * 60 * 60 * 1000);
}
