"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import MatchRowCompact from "./MatchRowCompact";
import PredictionSheet from "./PredictionSheet";
import { getOddsFor, type MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";

export default function MatchBoard({ matches, available }: { matches: MatchDTO[]; available: number }) {
  const [selection, setSelection] = useState<{ match: MatchDTO; market: MarketCode; choice: string } | null>(null);
  // Which of the compact rows the user has opened. The featured match is
  // always expanded, so it never appears here.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
        Şu anda GS, FB veya BJK için yaklaşan maç bulunamadı. Oranlar birazdan yenilenecek.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m, i) => {
        const onPick = (market: MarketCode, choice: string) =>
          setSelection({ match: m, market, choice });

        // The next match up gets the full treatment; everything behind it is
        // a compact row that expands on click, so the list stays scannable.
        if (i === 0) {
          return <MatchCard key={m.id} match={m} featured onPick={onPick} />;
        }

        const isOpen = !!expanded[m.id];
        return (
          <div key={m.id} className="space-y-2">
            <MatchRowCompact
              match={m}
              expanded={isOpen}
              onToggle={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
            />
            {isOpen && <MatchCard match={m} onPick={onPick} />}
          </div>
        );
      })}

      {selection && (
        <PredictionSheet
          match={selection.match}
          market={selection.market}
          choice={selection.choice}
          odds={
            getOddsFor(
              { ...selection.match, ...selection.match.extraOdds },
              selection.market,
              selection.choice
            ) ?? 0
          }
          available={available}
          weekBudget={selection.match.weekBudget}
          matchBudget={selection.match.matchBudget}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
