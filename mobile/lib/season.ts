// Mirrors the economy constants in the backend's lib/season.ts — the actual
// week/season date math happens server-side and arrives as ISO strings
// (LeaderboardScope.rangeStart/rangeEnd, MatchDTO.weekBudget/matchBudget), so
// only the display-facing numbers need duplicating here. These are
// display-only text, not enforcement (the API enforces the real ones) — but
// keep them in sync with lib/season.ts's WEEKLY_BUDGET/PER_MATCH_CAP or this
// screen's copy quietly drifts from what's actually enforced.
export const WEEKLY_BUDGET = 3000;
export const PER_MATCH_CAP = 1000;
