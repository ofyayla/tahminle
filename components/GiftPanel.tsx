"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatTL, formatMatchDate } from "@/lib/format";
import type { TransferTarget } from "./TransferPanel";

export type ReceivedGiftDTO = {
  id: string;
  from: string;
  price: number;
  stake: number;
  opened: boolean;
  createdAt: string;
  pick: {
    match: string;
    kickoff: string;
    market: string;
    label: string;
    odds: number;
    status: string;
    payout: number | null;
  } | null;
};

export type SentGiftDTO = {
  id: string;
  to: string;
  price: number;
  fee: number;
  opened: boolean;
  match: string;
  label: string;
  odds: number;
  status: string;
};

const PRESETS = [100, 250, 500];

export default function GiftPanel({
  targets,
  received,
  sent,
  available,
}: {
  targets: TransferTarget[];
  received: ReceivedGiftDTO[];
  sent: SentGiftDTO[];
  available: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [price, setPrice] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recipient = targets.find((t) => t.id === recipientId);
  const fee = Math.max(5, Math.round(price * 0.1));
  const canSubmit = !!recipient && price >= 50 && price <= available;

  const unopened = received.filter((g) => !g.opened);

  async function send() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, price }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hediye gönderilemedi.");
        return;
      }
      setDone(`${recipient!.displayName} adlı oyuncuya sürpriz kupon gönderildi.`);
      setRecipientId("");
      router.refresh();
    } catch {
      setError("Bağlantı hatası, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  async function openBox(id: string) {
    setBusy(true);
    try {
      await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openGiftId: id }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" />
          </svg>
          {unopened.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
              {unopened.length}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base">Sürpriz Kupon</div>
          <div className="text-xs text-ink-dim">
            {unopened.length > 0
              ? `${unopened.length} açılmamış hediyen var!`
              : "Bir taraftara rastgele bir kupon hediye et"}
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`h-4 w-4 flex-shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {received.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Sana Gelenler</div>
              <div className="flex flex-col gap-2">
                {received.map((g) => (
                  <div key={g.id} className="rounded-xl border border-card-border bg-bg-elevated p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">
                        <span className="font-bold text-gold">{g.from}</span>
                        <span className="text-ink-dim"> → sürpriz kupon</span>
                      </span>
                      <span className="font-display flex-shrink-0 text-sm text-gold">{formatTL(g.stake)}</span>
                    </div>

                    {g.opened && g.pick ? (
                      <div className="mt-2 border-t border-card-border pt-2 text-sm">
                        <div className="text-ink-dim">{g.pick.match}</div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="font-bold">{g.pick.label}</span>
                          <span className="rounded-lg bg-gold/15 px-2 py-0.5 font-display text-xs text-gold">
                            {g.pick.odds.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-ink-faint">
                          {g.pick.market} · {formatMatchDate(new Date(g.pick.kickoff))}
                        </div>
                        {g.pick.status !== "open" && (
                          <div className={`mt-1.5 text-xs font-bold ${g.pick.status === "won" ? "text-green" : "text-red"}`}>
                            {g.pick.status === "won" ? `Kazandı · +${formatTL(g.pick.payout ?? 0)}` : "Kaybetti"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openBox(g.id)}
                        className="mt-2 w-full rounded-lg bg-gold py-2 text-sm font-bold text-black disabled:opacity-50"
                      >
                        🎁 Kutuyu Aç
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-card-border pt-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Kime</div>
            <div className="grid grid-cols-2 gap-2">
              {targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRecipientId(t.id === recipientId ? "" : t.id)}
                  className={`truncate rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    recipientId === t.id
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-card-border bg-bg-elevated text-ink-dim"
                  }`}
                >
                  {t.displayName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Paket</div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={p > available}
                  onClick={() => setPrice(p)}
                  className={`rounded-xl border px-2 py-2 text-sm font-bold transition-colors disabled:opacity-35 ${
                    price === p ? "border-gold bg-gold/10 text-gold" : "border-card-border bg-bg-elevated text-ink-dim"
                  }`}
                >
                  ₺{p}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              {formatTL(price)} ödersin · {formatTL(fee)} paketleme ücreti ·{" "}
              <span className="text-ink-dim">{formatTL(price - fee)}</span> kupona yatırılır.
              Kupon rastgele seçilir (Maç Sonucu, 2.5 Alt/Üst, Karşılıklı Gol veya Çifte Şans) ve
              kazanırsa tamamı alıcıya gider.
            </p>
          </div>

          {error && <p className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
          {done && <p className="rounded-xl bg-green/10 px-3 py-2 text-sm text-green">{done}</p>}

          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={send}
            className="rounded-xl bg-gold py-3 text-sm font-bold text-black disabled:opacity-35"
          >
            {busy ? "Gönderiliyor…" : !recipient ? "Önce alıcı seç" : price > available ? "Bakiye yetersiz" : "Hediyeyi Gönder"}
          </button>

          {sent.length > 0 && (
            <div className="border-t border-card-border pt-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Gönderdiklerin</div>
              <div className="flex flex-col gap-2">
                {sent.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-dim">
                      → <span className="text-ink">{g.to}</span>
                      <span className="text-ink-faint"> · {g.opened ? g.label : "açılmadı"}</span>
                    </span>
                    <span className="font-display flex-shrink-0 text-red">−{formatTL(g.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
