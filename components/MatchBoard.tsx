"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import PredictionSheet from "./PredictionSheet";
import type { MatchDTO } from "@/lib/types";

export default function MatchBoard({ matches, available }: { matches: MatchDTO[]; available: number }) {
  const [selection, setSelection] = useState<{ match: MatchDTO; choice: "1" | "X" | "2" } | null>(null);

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
        Şu anda GS, FB veya BJK için yaklaşan maç bulunamadı. Oranlar birazdan yenilenecek.
      </div>
    );
  }

  const odds = (m: MatchDTO, c: "1" | "X" | "2") => (c === "1" ? m.oddsHome : c === "X" ? m.oddsDraw : m.oddsAway);

  return (
    <div className="space-y-3">
      {matches.map((m, i) => (
        <MatchCard key={m.id} match={m} featured={i === 0} onPick={(choice) => setSelection({ match: m, choice })} />
      ))}

      {selection && (
        <PredictionSheet
          match={selection.match}
          choice={selection.choice}
          odds={odds(selection.match, selection.choice)}
          available={available}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
