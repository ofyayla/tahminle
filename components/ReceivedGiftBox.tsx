"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMatchDate, formatOdds, formatTL } from "@/lib/format";
import type { ReceivedGiftDTO } from "@/lib/walletTypes";

// One received surprise coupon, unopened (a box to tap) or revealed (the
// pick it turned into). Owns the open request so both entry points — the
// wallet inbox banner and the gift page's history — behave identically.
// `onOpened`, when given, is called instead of the default router.refresh()
// — the wallet inbox uses it to keep the box visible through the reload
// that would otherwise drop it (see GiftInbox).
export default function ReceivedGiftBox({
  gift,
  onOpened,
}: {
  gift: ReceivedGiftDTO;
  onOpened?: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openGiftId: gift.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hediye açılamadı.");
        return;
      }
      if (onOpened) onOpened(gift.id);
      else router.refresh();
    } catch {
      setError("Bağlantı hatası, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-card-border bg-bg-elevated p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          <span className="font-bold text-gold">{gift.from}</span>
          <span className="text-ink-dim"> → sürpriz kupon</span>
        </span>
        <span className="font-display flex-shrink-0 text-sm text-gold">{formatTL(gift.stake)}</span>
      </div>

      {gift.opened && gift.pick ? (
        <div className="mt-2 border-t border-card-border pt-2 text-sm">
          <div className="text-ink-dim">{gift.pick.match}</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="font-bold">{gift.pick.label}</span>
            <span className="rounded-lg bg-gold/15 px-2 py-0.5 font-display text-xs text-gold">
              {formatOdds(gift.pick.odds)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-ink-faint">
            {gift.pick.market} · {formatMatchDate(new Date(gift.pick.kickoff))}
          </div>
          {gift.pick.status !== "open" && (
            <div className={`mt-1.5 text-xs font-bold ${gift.pick.status === "won" ? "text-green" : "text-red"}`}>
              {gift.pick.status === "won" ? `Kazandı · +${formatTL(gift.pick.payout ?? 0)}` : "Kaybetti"}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={open}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold py-2 text-sm font-bold text-bg disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" />
          </svg>
          {busy ? "Açılıyor…" : "Kutuyu Aç"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
