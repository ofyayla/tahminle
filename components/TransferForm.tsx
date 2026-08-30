"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTL } from "@/lib/format";
import type { TransferHistoryDTO, TransferTarget } from "@/lib/walletTypes";

const PRESETS = [50, 100, 250, 500];

export default function TransferForm({
  targets,
  history,
  available,
}: {
  targets: TransferTarget[];
  history: TransferHistoryDTO[];
  available: number;
}) {
  const router = useRouter();
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState("");
  // A transfer can't be undone, so the button never fires the request
  // directly — it flips into an explicit confirm step first.
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recipient = targets.find((t) => t.id === recipientId);
  const canSubmit = !!recipient && amount >= 10 && amount <= available;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, amount, note: note || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Transfer başarısız.");
        return;
      }
      setDone(`${formatTL(amount)} → ${recipient!.displayName}`);
      setRecipientId("");
      setNote("");
      setConfirming(false);
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
          <p className="text-sm text-ink-faint">Bakiye gönderebileceğin bir taraftar yok.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setRecipientId(t.id === recipientId ? "" : t.id);
                  setConfirming(false);
                }}
                className={`truncate rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  recipientId === t.id
                    ? "border-green bg-green/10 text-green"
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
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-ink-dim">Tutar</label>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={p > available}
              onClick={() => {
                setAmount(p);
                setConfirming(false);
              }}
              className={`rounded-xl border px-2 py-2 text-sm font-bold transition-colors disabled:opacity-35 ${
                amount === p ? "border-gold bg-gold/10 text-gold" : "border-card-border bg-bg-elevated text-ink-dim"
              }`}
            >
              ₺{p}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={10}
          max={available}
          value={amount}
          onChange={(e) => {
            setAmount(Math.floor(Number(e.target.value) || 0));
            setConfirming(false);
          }}
          className="w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-gold"
        />
        <p className="mt-1.5 text-[11px] text-ink-faint">Kullanılabilir: {formatTL(available)}</p>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-ink-dim">
          Not <span className="font-normal normal-case text-ink-faint">(isteğe bağlı)</span>
        </label>
        <input
          type="text"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Bol şans!"
          className="w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      {error && <p className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
      {done && <p className="rounded-xl bg-green/10 px-3 py-2 text-sm text-green">Gönderildi: {done}</p>}

      {confirming ? (
        <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
          <p className="text-sm text-ink">
            <span className="font-bold text-gold">{formatTL(amount)}</span> tutarını{" "}
            <span className="font-bold">{recipient?.displayName}</span> adlı oyuncuya göndereceksin. Bu işlem geri
            alınamaz.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="flex-1 rounded-xl border border-card-border bg-bg-elevated py-2.5 text-sm font-bold text-ink-dim disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-bold text-bg disabled:opacity-50"
            >
              {busy ? "Gönderiliyor…" : "Onayla ve Gönder"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            setDone(null);
            setError(null);
            setConfirming(true);
          }}
          className="rounded-xl bg-gold py-3 text-sm font-bold text-bg disabled:opacity-35"
        >
          {!recipient ? "Önce alıcı seç" : amount > available ? "Bakiye yetersiz" : "Devam"}
        </button>
      )}

      {history.length > 0 && (
        <div className="border-t border-card-border pt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Transfer Geçmişi</div>
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink-dim">
                  {h.direction === "out" ? "→ " : "← "}
                  <span className="text-ink">{h.counterparty}</span>
                  {h.note && <span className="text-ink-faint"> · {h.note}</span>}
                </span>
                <span className={`font-display flex-shrink-0 ${h.direction === "out" ? "text-red" : "text-green"}`}>
                  {h.direction === "out" ? "−" : "+"}
                  {formatTL(h.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
