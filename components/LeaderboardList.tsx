"use client";

import { useState } from "react";
import Image from "next/image";
import { TEAM_META, type TeamCode } from "@/lib/teams";

type Row = {
  rank: number;
  id: string;
  displayName: string;
  favoriteTeam: string | null;
  points: number;
  correct: number;
  total: number;
  accuracy: number;
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
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
                  {meta ? (
                    <Image src={meta.logo} alt={meta.name} width={40} height={40} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-[11px] text-ink-dim">
                      {row.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {row.displayName} {row.isYou && <span className="text-gold">(Sen)</span>}
                  </div>
                  <div className="text-[11px] text-ink-dim">
                    {row.total > 0
                      ? `${row.correct}/${row.total} doğru · %${row.accuracy} isabet`
                      : "Bu hafta henüz tahmin yok"}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-display text-sm text-gold">{row.points}</div>
                  <div className="text-[10px] text-ink-faint">puan</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
