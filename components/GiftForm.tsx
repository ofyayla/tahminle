"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTL } from "@/lib/format";
import type { ReceivedGiftDTO, SentGiftDTO, TransferTarget } from "@/lib/walletTypes";
import ReceivedGiftBox from "./ReceivedGiftBox";

const PRESETS = [100, 250, 500];

export default function GiftForm({
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
  const [recipientId, setRecipientId] = useState("");
  const [price, setPrice] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recipient = targets.find((t) => t.id === recipientId);
  const fee = Math.max(5, Math.round(price * 0.1));
  const canSubmit = !!recipient && price >= 50 && price <= available;

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-ink-dim">Kime</label>
        {targets.length === 0 ? (
          <p className="text-sm text-ink-faint">Hediye gönderebileceğin bir taraftar yok.</p>
        ) : (
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
        )}
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-ink-dim">Paket</label>
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
          <span className="text-ink-dim">{formatTL(price - fee)}</span> kupona yatırılır. Kupon rastgele seçilir
          (Maç Sonucu, 2.5 Alt/Üst, Karşılıklı Gol veya Çifte Şans) ve kazanırsa tamamı alıcıya gider.
        </p>
        <p className="mt-2 text-[11px] text-ink-faint">Kullanılabilir: {formatTL(available)}</p>
      </div>

      {error && <p className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
      {done && <p className="rounded-xl bg-green/10 px-3 py-2 text-sm text-green">{done}</p>}

      <button
        type="button"
        disabled={!canSubmit || busy}
        onClick={send}
        className="rounded-xl bg-gold py-3 text-sm font-bold text-bg disabled:opacity-35"
      >
        {busy ? "Gönderiliyor…" : !recipient ? "Önce alıcı seç" : price > available ? "Bakiye yetersiz" : "Hediyeyi Gönder"}
      </button>

      {received.length > 0 && (
        <div className="border-t border-card-border pt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Sana Gelenler</div>
          <div className="flex flex-col gap-2">
            {received.map((g) => (
              <ReceivedGiftBox key={g.id} gift={g} />
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div className="border-t border-card-border pt-4">
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
  );
}
