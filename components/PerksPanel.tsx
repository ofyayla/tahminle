"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPerkStatus } from "@/lib/perks";

export default function PerksPanel({ perks }: { perks: UserPerkStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activateDoubleKasa() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/perks/double-kasa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Joker kullanılamadı.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Jokerler</div>
        <div className="font-display text-lg mt-0.5">Sezonda bir kez</div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-bg-elevated p-3.5">
          <div className="min-w-0">
            <div className="text-sm font-bold">💰 Çifte Kasa</div>
            <div className="text-[11px] text-ink-dim">
              {perks.doubleKasa.available ? "Bu haftaki kasan ₺2.000'e çıkar" : "Bu sezon kullanıldı"}
            </div>
          </div>
          {perks.doubleKasa.available ? (
            <button
              type="button"
              onClick={activateDoubleKasa}
              disabled={loading}
              className="flex-shrink-0 rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "..." : "Kullan"}
            </button>
          ) : (
            <span className="flex-shrink-0 rounded-full bg-bg px-3 py-1.5 text-[11px] font-bold text-ink-faint">
              Kullanıldı
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-bg-elevated p-3.5">
          <div className="min-w-0">
            <div className="text-sm font-bold">🛡 Sigorta</div>
            <div className="text-[11px] text-ink-dim">
              {perks.insurance.available ? "Bir tahminini kaybedersen iade alırsın" : "Bu sezon kullanıldı"}
            </div>
          </div>
          <span className="flex-shrink-0 rounded-full bg-bg px-3 py-1.5 text-[11px] font-bold text-ink-faint">
            {perks.insurance.available ? "Tahminler'den seç" : "Kullanıldı"}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-[11px] text-red">{error}</p>}
    </section>
  );
}
