"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatOdds, formatTL } from "@/lib/format";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import TeamAvatar from "./TeamAvatar";
import type { MatchDTO } from "@/lib/types";
import type { WeeklyBankoStatus } from "@/lib/data";

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
  weeklyBanko,
  onClose,
}: {
  match: MatchDTO;
  market: MarketCode;
  choice: string;
  odds: number;
  available: number;
  weekBudget: Budget;
  matchBudget: Budget;
  weeklyBanko: WeeklyBankoStatus;
  onClose: () => void;
}) {
  const router = useRouter();
  // Kasa iki farklı sınır koyabilir: haftalık toplam ve bu maça özel tavan.
  // Hangisi daha düşükse bet slip'in gerçek tavanı odur.
  const cap = Math.min(available, weekBudget.remaining, matchBudget.remaining);
  const [stake, setStake] = useState(Math.min(100, cap));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wantsBanko, setWantsBanko] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const potential = Math.round(stake * odds);
  const choiceText = getChoiceLabel(match, market, choice);
  const marketName = getMarketName(market);
  const matchBinds = matchBudget.remaining < weekBudget.remaining && matchBudget.remaining < available;

  // Bu maçtan farklı, kilitlenmiş bir Banko varsa bu tahmin Banko yapılamaz.
  const bankoLockedElsewhere = !!weeklyBanko && weeklyBanko.matchId !== match.id && weeklyBanko.locked;
  const movesExistingBanko = !!weeklyBanko && weeklyBanko.matchId !== match.id && !weeklyBanko.locked;

  async function submit() {
    setError(null);
    setNotice(null);
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
        body: JSON.stringify({ matchId: match.id, market, choice, stake, isBanko: wantsBanko }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tahmin oluşturulamadı.");
        return;
      }
      if (data.bankoError) {
        // Tahmin başarıyla oluşturuldu, yalnızca Banko ataması başarısız
        // oldu — kuponu iptal etmenin bir anlamı yok, kullanıcıyı bilgilendir.
        setNotice(`Tahmin kilitlendi ama Banko atanamadı: ${data.bankoError}`);
        router.refresh();
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

        <button
          type="button"
          disabled={bankoLockedElsewhere}
          onClick={() => setWantsBanko((v) => !v)}
          className={`mb-3 w-full rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            wantsBanko ? "border-gold bg-gold/10" : "border-card-border bg-bg-elevated"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              🎖 Bu tahmini Banko yap
            </span>
            <span
              className={`flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                wantsBanko ? "justify-end bg-gold" : "justify-start bg-card-border"
              } px-0.5`}
            >
              <span className="h-4 w-4 rounded-full bg-bg" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-dim">
            {bankoLockedElsewhere
              ? `Bu haftanın bankosu kilitli: ${weeklyBanko!.label}`
              : movesExistingBanko
              ? `Bankonu buradan taşır (şu an: ${weeklyBanko!.label})`
              : "Tutarsa kârın iki katına çıkar. Haftada bir kez, maç başlayana kadar değiştirebilirsin."}
          </p>
        </button>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-bg-elevated px-3.5 py-3 text-sm">
          <span className="text-ink-dim">{wantsBanko ? "Banko tutarsa" : "Olası dönüş"}</span>
          <span className={`font-display ${wantsBanko ? "text-gold" : "text-green"}`}>
            {formatTL(wantsBanko ? potential * 2 : potential)}
          </span>
        </div>

        {notice && <p className="mb-3 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-dim">{notice}</p>}
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
