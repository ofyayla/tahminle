"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatOdds, formatTL } from "@/lib/format";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import TeamAvatar from "./TeamAvatar";
import type { MatchDTO } from "@/lib/types";

const QUICK_STAKES = [50, 100, 250, 500];

type Budget = { cap: number; used: number; remaining: number };

export default function PredictionSheet({
  match,
  market,
  choice,
  odds,
  available,
  weekBudget,
  matchBudget,
  onClose,
}: {
  match: MatchDTO;
  market: MarketCode;
  choice: string;
  odds: number;
  available: number;
  weekBudget: Budget;
  matchBudget: Budget;
  onClose: () => void;
}) {
  const router = useRouter();
  // Kasa iki farklı sınır koyabilir: haftalık toplam (₺1.000) ve bu maça özel
  // tavan (₺400). Hangisi daha düşükse bet slip'in gerçek tavanı odur.
  const cap = Math.min(available, weekBudget.remaining, matchBudget.remaining);
  const [stake, setStake] = useState(Math.min(100, cap));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const potential = Math.round(stake * odds);
  const choiceText = getChoiceLabel(match, market, choice);
  const marketName = getMarketName(market);
  const matchBinds = matchBudget.remaining < weekBudget.remaining && matchBudget.remaining < available;

  async function submit() {
    setError(null);
    if (stake < 10) {
      setError("En az ₺10 stake girmelisin.");
      return;
    }
    if (stake > available) {
      setError("Sanal bakiyen bu miktar için yeterli değil.");
      return;
    }
    if (stake > weekBudget.remaining) {
      setError(`Bu hafta için kasan ₺${weekBudget.remaining} kaldı. Kasa her Pazartesi yenilenir.`);
      return;
    }
    if (stake > matchBudget.remaining) {
      setError(`Bu maça en fazla ₺${matchBudget.cap} yatırabilirsin, ₺${matchBudget.remaining} kaldı.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, market, choice, stake }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tahmin oluşturulamadı.");
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-card-border bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base">TAHMİNİNİ KUR</h2>
          <button onClick={onClose} className="text-ink-dim text-xl leading-none px-2">
            ×
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-card-border bg-bg-elevated p-3">
          <TeamAvatar name={match.homeTeam} size={36} />
          <div className="flex-1 text-center text-xs text-ink-dim">
            <div className="font-semibold text-ink">{match.homeTeam} – {match.awayTeam}</div>
          </div>
          <TeamAvatar name={match.awayTeam} size={36} />
        </div>

        <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 p-3">
          <div className="text-xs uppercase tracking-wide text-gold-dim">{marketName}</div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{choiceText}</span>
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-bg">{formatOdds(odds)}</span>
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-dim">
            <span>Bu hafta kasan</span>
            <span>₺{weekBudget.used} / ₺{weekBudget.cap}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card-border">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.min(100, Math.round((weekBudget.used / weekBudget.cap) * 100))}%` }}
            />
          </div>
          {matchBinds && (
            <p className="mt-2 text-[11px] text-ink-dim">
              Bu maça en fazla {formatTL(matchBudget.cap)} yatırabilirsin — {formatTL(matchBudget.remaining)} kaldı.
            </p>
          )}
        </div>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-dim">
            <span>Sanal Stake</span>
            <span>Kullanılabilir: {formatTL(cap)}</span>
          </div>
          <input
            type="number"
            min={10}
            max={cap}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3 text-lg font-display outline-none focus:border-gold"
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {QUICK_STAKES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={s > cap}
                onClick={() => setStake(s)}
                className="rounded-lg border border-card-border bg-bg-elevated py-2 text-xs font-semibold text-ink-dim enabled:hover:border-gold enabled:hover:text-ink disabled:opacity-30"
              >
                ₺{s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-bg-elevated px-3.5 py-3 text-sm">
          <span className="text-ink-dim">Olası dönüş</span>
          <span className="font-display text-green">{formatTL(potential)}</span>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Kilitleniyor..." : "Tahmini Kilitle"}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-faint">Gerçek para içermez · Tüm bakiyeler sanaldır.</p>
      </div>
    </div>
  );
}
