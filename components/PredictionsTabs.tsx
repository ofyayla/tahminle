"use client";

import { useState } from "react";
import PredictionCard from "./PredictionCard";
import type { PredictionDTO } from "@/lib/predictionTypes";

export default function PredictionsTabs({
  open,
  settled,
}: {
  open: PredictionDTO[];
  settled: PredictionDTO[];
}) {
  const [tab, setTab] = useState<"open" | "settled">("open");
  const list = tab === "open" ? open : settled;

  return (
    <div>
      <div className="mb-4 flex rounded-2xl border border-card-border bg-card p-1">
        <button
          onClick={() => setTab("open")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            tab === "open" ? "bg-gold text-bg" : "text-ink-dim"
          }`}
        >
          Açık <span className="ml-1 opacity-70">{open.length}</span>
        </button>
        <button
          onClick={() => setTab("settled")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            tab === "settled" ? "bg-gold text-bg" : "text-ink-dim"
          }`}
        >
          Sonuçlanan <span className="ml-1 opacity-70">{settled.length}</span>
        </button>
      </div>

      <div className="mb-3">
        <h2 className="font-display text-lg">{tab === "open" ? "Açık tahminin" : "Sonuçlanan tahminlerin"}</h2>
        <p className="text-sm text-ink-dim">
          {tab === "open" ? "Kilitleyip maç sonucunu beklediğin seçim." : "Kapanmış maçlardaki performansın."}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
          {tab === "open" ? "Şu an açık bir tahminin yok." : "Henüz sonuçlanan tahminin yok."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </div>
      )}
    </div>
  );
}
