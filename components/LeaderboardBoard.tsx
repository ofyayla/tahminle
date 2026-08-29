"use client";

import { useState } from "react";
import Image from "next/image";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { formatDateRange, formatTL } from "@/lib/format";
import type { LeaderboardScope } from "@/lib/data";

const FILTERS: { code: TeamCode | "ALL"; label: string }[] = [
  { code: "ALL", label: "Tümü" },
  { code: "GS", label: "GS" },
  { code: "FB", label: "FB" },
  { code: "BJK", label: "BJK" },
];

const SCOPES: { key: "week" | "season"; label: string }[] = [
  { key: "week", label: "Bu Hafta" },
  { key: "season", label: "Sezon" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

function NetAmount({ net, size }: { net: number; size: "sm" | "lg" }) {
  const cls = net >= 0 ? "text-green" : "text-red";
  const text = `${net >= 0 ? "+" : "−"}${formatTL(Math.abs(net))}`;
  return <span className={`font-display ${size === "lg" ? "text-2xl" : "text-sm"} ${cls}`}>{text}</span>;
}

export default function LeaderboardBoard({
  week,
  season,
}: {
  week: LeaderboardScope;
  season: LeaderboardScope;
}) {
  const [scope, setScope] = useState<"week" | "season">("week");
  const [filter, setFilter] = useState<TeamCode | "ALL">("ALL");

  const data = scope === "week" ? week : season;
  const visible = filter === "ALL" ? data.ranked : data.ranked.filter((r) => r.favoriteTeam === filter);
  const emptyLabel = scope === "week" ? "Bu hafta henüz tahmin yok" : "Bu sezon henüz tahmin yok";

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
              scope === s.key ? "border-gold bg-gold text-bg" : "border-card-border bg-card text-ink-dim"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {data.you && (
        <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gold-dim">Senin Sıran</div>
              <div className="font-display text-2xl">#{data.you.rank}</div>
              <div className="mt-1 text-xs text-ink-dim">{data.totalPlayers} taraftar arasında</div>
            </div>
            <div className="text-right">
              <NetAmount net={data.you.net} size="lg" />
              <div className="text-xs text-ink-dim">net kâr</div>
              <div className="mt-1 text-xs text-ink-dim">
                {data.you.total > 0 ? `${data.you.correct}/${data.you.total} · %${data.you.accuracy}` : "tahmin yok"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-gold/20 pt-3 text-[11px] text-ink-dim">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gold">
              <rect x="3" y="6" width="18" height="15" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {formatDateRange(new Date(data.rangeStart), new Date(data.rangeEnd))}
          </div>
        </div>
      )}

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
                    {row.total > 0 ? `${row.correct}/${row.total} doğru · %${row.accuracy} isabet` : emptyLabel}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <NetAmount net={row.net} size="sm" />
                  <div className="text-[10px] text-ink-faint">net kâr</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
