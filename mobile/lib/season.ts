// Mirrors the economy constants in the backend's lib/season.ts — the actual
// week/season date math happens server-side and arrives as ISO strings
// (LeaderboardScope.rangeStart/rangeEnd, MatchDTO.weekBudget/matchBudget), so
// only the display-facing numbers need duplicating here.
export const WEEKLY_BUDGET = 1000;
export const PER_MATCH_CAP = 400;
