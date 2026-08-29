"use client";

import TeamAvatar from "./TeamAvatar";
import { formatMatchDate, formatTime } from "@/lib/format";
import type { MatchDTO } from "@/lib/types";

// The condensed form used for every match after the featured one. Tapping it
// expands the full MatchCard in place, so the odds stay one click away without
// making the list a wall of cards.
export default function MatchRowCompact({
  match,
  expanded,
  onToggle,
}: {
  match: MatchDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const kickoff = new Date(match.kickoff);
  const isLive = match.status === "live";
  const hasPick = Object.keys(match.openByMarket).length > 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-left transition-colors hover:border-gold/40"
    >
      {/* The two crests overlap slightly, which reads as "these two are
          playing each other" in a row this short. */}
      <div className="flex flex-shrink-0 items-center">
        <TeamAvatar name={match.homeTeam} size={40} />
        <div className="-ml-3">
          <TeamAvatar name={match.awayTeam} size={40} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">
          {match.homeTeam} – {match.awayTeam}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[13px]">
          {isLive ? (
            <>
              <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-red" />
              <span className="font-semibold text-red">
                CANLI
                {match.liveScore ? ` · ${match.liveScore.home}-${match.liveScore.away}` : ""}
              </span>
            </>
          ) : (
            <span className="text-ink-dim">
              {formatMatchDate(kickoff)} · {formatTime(kickoff)}
            </span>
          )}
          {hasPick && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
        </div>
      </div>

      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
          expanded ? "border-gold/40 bg-gold/15 text-gold" : "border-card-border bg-bg-elevated text-ink"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : "-rotate-90"}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}
