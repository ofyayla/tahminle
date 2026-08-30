"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTL } from "@/lib/format";
import type { UserPerkStatus } from "@/lib/perks";

// Çifte Kasa doubles this week's kasa, so it lives inside the kasa card
// rather than in a perks drawer — the joker becomes visible at the moment
// it is worth something. It stays quiet early in the week and turns into a
// filled CTA once the budget is actually running out.
const URGENT_AT = 0.6;

export default function DoubleKasaCta({
  perks,
  cap,
  used,
  overCap,
}: {
  perks: UserPerkStatus;
  cap: number;
  used: number;
  overCap: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!perks.doubleKasa.available) return null;

  const urgent = overCap || (cap > 0 && used / cap >= URGENT_AT);
  const boosted = cap * 2;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/perks/double-kasa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Joker kullanılamadı.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
        <p className="text-sm leading-relaxed text-ink">
          Sezonluk tek <span className="font-bold">Çifte Kasa</span> hakkını bu hafta için kullanacaksın. Kasan{" "}
          <span className="font-bold text-gold">{formatTL(boosted)}</span> olacak ve bu işlem geri alınamaz.
        </p>
        {error && <p className="mt-2 text-xs text-red">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="flex-1 rounded-lg border border-card-border bg-card py-2 text-xs font-bold text-ink-dim disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={activate}
            disabled={busy}
            className="flex-1 rounded-lg bg-gold py-2 text-xs font-bold text-bg disabled:opacity-50"
          >
            {busy ? "…" : "Onayla"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${urgent ? "border-gold/35 bg-gold/5" : "border-card-border bg-bg-elevated"}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full ${urgent ? "bg-gold/15 text-gold" : "bg-ink-dim/10 text-ink-dim"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold">
            {overCap ? "Kasan doldu" : urgent ? "Kasan dolmak üzere" : "Çifte Kasa jokerin hazır"}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-dim">
            Bu haftaki kasanı {formatTL(boosted)} yapar · sezonda bir kez
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className={
            urgent
              ? "flex-shrink-0 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-bg"
              : "flex-shrink-0 rounded-lg border border-gold/40 px-3.5 py-1.5 text-xs font-bold text-gold"
          }
        >
          Kullan
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
