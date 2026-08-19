"use client";

import { useState } from "react";
import { TEAM_META, type TeamCode } from "@/lib/teams";

type Row = {
  rank: number;
  id: string;
  displayName: string;
  favoriteTeam: string | null;
  isYou: boolean;
};

const FILTERS: { code: TeamCode | "ALL"; label: string }[] = [
  { code: "ALL", label: "Tümü" },
  { code: "GS", label: "GS" },
  { code: "FB", label: "FB" },
  { code: "BJK", label: "BJK" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardList({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<TeamCode | "ALL">("ALL");
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.favoriteTeam === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.code}
            onClick={() => setFilter(f.code)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
              filter === f.code
                ? "border-gold bg-gold text-bg"
                : "border-card-border bg-card text-ink-dim"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
            Bu filtrede henüz taraftar yok.
          </div>
        ) : (
          visible.map((row) => {
            const meta = row.favoriteTeam ? TEAM_META[row.favoriteTeam as TeamCode] : null;
            return (
              <div
                key={row.id}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                  row.isYou ? "border-gold bg-gold/10" : "border-card-border bg-card"
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated font-display text-sm">
                  {row.rank <= 3 ? MEDAL[row.rank - 1] : `#${row.rank}`}
                </div>
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 font-display text-[11px]"
                  style={{ borderColor: meta?.color ?? "#616a80", color: meta?.color ?? "#9aa2b8" }}
                >
                  {meta?.short ?? row.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {row.displayName} {row.isYou && <span className="text-gold">(Sen)</span>}
                  </div>
                  <div className="text-[11px] text-ink-dim">{meta?.name ?? "Takım seçilmedi"}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-bg-elevated px-2.5 py-1.5 text-ink-faint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <span className="text-[10px] font-bold tracking-wide">GİZLİ</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
