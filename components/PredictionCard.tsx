"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TeamAvatar from "./TeamAvatar";
import { formatMatchDate, formatOdds, formatTime, formatTL } from "@/lib/format";
import { getActualResultLabel, getChoiceLabel, getMarketName } from "@/lib/markets";
import type { PredictionDTO } from "@/lib/predictionTypes";
import type { WeeklyBankoStatus } from "@/lib/data";
import type { UserPerkStatus } from "@/lib/perks";

export default function PredictionCard({
  prediction,
  weeklyBanko,
  perks,
}: {
  prediction: PredictionDTO;
  weeklyBanko?: WeeklyBankoStatus;
  perks?: UserPerkStatus | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"banko" | "insurance" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { match } = prediction;
  const kickoff = new Date(match.kickoff);
  const choiceText = getChoiceLabel(match, prediction.market, prediction.choice);
  const marketName = getMarketName(prediction.market);
  const resultText = getActualResultLabel(match, prediction.market, match);
  const potential = Math.round(prediction.stake * prediction.oddsAtPick);
  const isSettled = prediction.status !== "open";
  const insuredLoss = prediction.status === "lost" && prediction.wasInsured;
  const walletEffect =
    prediction.status === "won"
      ? (prediction.payout ?? 0)
      : prediction.status === "cancelled" || insuredLoss
      ? prediction.stake
      : -prediction.stake;

  const statusMeta =
    prediction.status === "open"
      ? { label: "Maç bekleniyor", cls: "text-gold" }
      : prediction.status === "won"
      ? { label: prediction.isBanko ? "Kazandın · Banko 2x" : "Kazandın", cls: "text-green" }
      : prediction.status === "cancelled"
      ? { label: "Ertelendi · İade edildi", cls: "text-ink-dim" }
      : insuredLoss
      ? { label: "Kaybettin · Sigortalı", cls: "text-ink-dim" }
      : { label: "Kaybettin", cls: "text-red" };

  // Banko yalnızca maç henüz başlamadıysa değiştirilebilir — açık tahmin
  // olsa bile maç canlıya geçtiyse bu kart artık pasif görünür.
  const canActOnBanko = prediction.status === "open" && match.status === "upcoming";
  const bankoLockedElsewhere = !!weeklyBanko && weeklyBanko.matchId !== match.id && weeklyBanko.locked;
  const isInsuredOpen = perks?.insurance.usedForPredictionId === prediction.id;
  const canInsure = canActOnBanko && !isInsuredOpen && !!perks?.insurance.available;

  async function toggleBanko() {
    setActionError(null);
    setBusy("banko");
    try {
      const res = await fetch("/api/predictions/banko", {
        method: prediction.isBanko ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId: prediction.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Banko güncellenemedi.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function insure() {
    setActionError(null);
    setBusy("insurance");
    try {
      const res = await fetch("/api/perks/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId: prediction.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Sigorta uygulanamadı.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`rounded-2xl border p-4 ${prediction.isBanko ? "border-gold/50 bg-gold/5" : "border-card-border bg-card"}`}>
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold">
        <span className={`flex items-center gap-1.5 ${statusMeta.cls}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            {prediction.status === "open" ? (
              <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>
            ) : prediction.status === "won" ? (
              <path d="M20 6L9 17l-5-5" />
            ) : prediction.status === "cancelled" || insuredLoss ? (
              <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></>
            ) : (
              <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
            )}
          </svg>
          {statusMeta.label}
        </span>
        <span className="text-ink-faint">
          {prediction.status === "open"
            ? `${formatMatchDate(kickoff)} · ${formatTime(kickoff)}`
            : prediction.settledAt && formatMatchDate(new Date(prediction.settledAt))}
        </span>
      </div>

      {(prediction.isBanko || isInsuredOpen) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {prediction.isBanko && (
            <div className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-3 py-1.5 text-[11px] font-bold text-gold">
              🎖 Bu haftanın bankosu
            </div>
          )}
          {isInsuredOpen && (
            <div className="flex items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-[11px] font-bold text-ink-dim">
              🛡 Sigortalı
            </div>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <TeamAvatar name={match.homeTeam} size={32} />
        <div className="flex-1 text-center">
          <div className="text-sm font-bold">{match.homeTeam} – {match.awayTeam}</div>
          <div className="text-[11px] text-ink-faint">{formatMatchDate(kickoff)} · {formatTime(kickoff)}</div>
        </div>
        <TeamAvatar name={match.awayTeam} size={32} />
      </div>

      <div className="mb-3 flex items-center justify-between rounded-xl border border-card-border bg-bg-elevated px-3.5 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">{marketName}</div>
          <div className="text-sm font-semibold">{choiceText}</div>
        </div>
        <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-bg">{formatOdds(prediction.oddsAtPick)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Sanal Stake</div>
          <div className="font-display text-sm">{formatTL(prediction.stake)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Kilitli Oran</div>
          <div className="font-display text-sm">{formatOdds(prediction.oddsAtPick)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
            {prediction.status === "open"
              ? "Olası Dönüş"
              : prediction.status === "cancelled" || insuredLoss
              ? "İade"
              : "Sonuç"}
          </div>
          <div
            className={`font-display text-sm ${
              prediction.status === "won"
                ? "text-green"
                : prediction.status === "lost" && !insuredLoss
                ? "text-red"
                : prediction.status === "cancelled" || insuredLoss
                ? "text-ink-dim"
                : ""
            }`}
          >
            {prediction.status === "lost" && !insuredLoss
              ? `-${formatTL(prediction.stake)}`
              : prediction.status === "cancelled" || insuredLoss
              ? `+${formatTL(prediction.stake)}`
              : formatTL(
                  prediction.status === "won"
                    ? (prediction.payout ?? 0)
                    : prediction.isBanko
                    ? potential * 2
                    : potential
                )}
          </div>
        </div>
      </div>

      {canActOnBanko && (
        <div className="mt-3 flex gap-2 border-t border-card-border pt-3">
          <button
            type="button"
            disabled={busy !== null || (!prediction.isBanko && bankoLockedElsewhere)}
            onClick={toggleBanko}
            className={`flex-1 rounded-lg border py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              prediction.isBanko
                ? "border-gold bg-gold/10 text-gold"
                : "border-card-border bg-bg-elevated text-ink-dim hover:text-ink"
            }`}
          >
            {busy === "banko" ? "..." : prediction.isBanko ? "🎖 Bankoyu Kaldır" : "🎖 Banko Yap"}
          </button>
          {canInsure && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={insure}
              className="flex-1 rounded-lg border border-card-border bg-bg-elevated py-2 text-xs font-bold text-ink-dim transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "insurance" ? "..." : "🛡 Sigortala"}
            </button>
          )}
        </div>
      )}
      {actionError && <p className="mt-2 text-[11px] text-red">{actionError}</p>}

      {isSettled && (
        <div className="mt-3 border-t border-card-border pt-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-ink-dim hover:text-ink"
          >
            Maç sonu detayını {open ? "kapat" : "aç"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="mt-3 space-y-2.5 rounded-xl bg-bg-elevated p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">Gerçek sonuç</span>
                <span className="font-semibold">
                  {prediction.status === "cancelled" ? "Belirlenemedi" : resultText ?? "Bekleniyor"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">Senin tahminin</span>
                <span
                  className={`font-semibold ${
                    prediction.status === "won"
                      ? "text-green"
                      : prediction.status === "cancelled" || insuredLoss
                      ? "text-ink-dim"
                      : "text-red"
                  }`}
                >
                  {choiceText}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">Maç tarihi</span>
                <span className="font-semibold">{formatMatchDate(kickoff)} · {formatTime(kickoff)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">Sonuçlanma tarihi</span>
                <span className="font-semibold">
                  {prediction.settledAt
                    ? `${formatMatchDate(new Date(prediction.settledAt))} · ${formatTime(new Date(prediction.settledAt))}`
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-card-border pt-2.5 text-sm">
                <span className="text-ink-dim">Sanal stake</span>
                <span className="font-semibold">{formatTL(prediction.stake)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">Cüzdan etkisi</span>
                <span className={`font-display ${walletEffect >= 0 ? "text-green" : "text-red"}`}>
                  {walletEffect >= 0 ? "+" : "−"}
                  {formatTL(Math.abs(walletEffect))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
