"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import PredictionSheet from "./PredictionSheet";
import { getOddsFor, type MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";

export default function MatchBoard({ matches, available }: { matches: MatchDTO[]; available: number }) {
  const [selection, setSelection] = useState<{ match: MatchDTO; market: MarketCode; choice: string } | null>(null);

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
        Şu anda GS, FB veya BJK için yaklaşan maç bulunamadı. Oranlar birazdan yenilenecek.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m, i) => (
        <MatchCard
          key={m.id}
          match={m}
          featured={i === 0}
          onPick={(market, choice) => setSelection({ match: m, market, choice })}
        />
      ))}

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
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
