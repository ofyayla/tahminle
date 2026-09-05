"use client";

import { useState } from "react";
import TeamAvatar from "./TeamAvatar";
import { formatMatchDate, formatOdds, formatTime, formatTL } from "@/lib/format";
import { getActualResultLabel, getChoiceLabel, getMarketName } from "@/lib/markets";
import type { PredictionDTO } from "@/lib/predictionTypes";

export default function PredictionCard({ prediction }: { prediction: PredictionDTO }) {
  const [open, setOpen] = useState(false);

  const { match } = prediction;
  const kickoff = new Date(match.kickoff);
  const choiceText = getChoiceLabel(match, prediction.market, prediction.choice);
  const marketName = getMarketName(prediction.market);
  const resultText = getActualResultLabel(match, prediction.market, match);
  const potential = Math.round(prediction.stake * prediction.oddsAtPick);
  const isSettled = prediction.status !== "open";
  const walletEffect =
    prediction.status === "won"
      ? (prediction.payout ?? 0)
      : prediction.status === "cancelled"
      ? prediction.stake
      : -prediction.stake;

  const statusMeta =
    prediction.status === "open"
      ? { label: "Maç bekleniyor", cls: "text-gold" }
      : prediction.status === "won"
      ? { label: "Kazandın", cls: "text-green" }
      : prediction.status === "cancelled"
      ? { label: "Ertelendi · İade edildi", cls: "text-ink-dim" }
      : { label: "Kaybettin", cls: "text-red" };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold">
        <span className={`flex items-center gap-1.5 ${statusMeta.cls}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            {prediction.status === "open" ? (
              <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>
            ) : prediction.status === "won" ? (
              <path d="M20 6L9 17l-5-5" />
            ) : prediction.status === "cancelled" ? (
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
              : prediction.status === "cancelled"
              ? "İade"
              : "Sonuç"}
          </div>
          <div
            className={`font-display text-sm ${
              prediction.status === "won"
                ? "text-green"
                : prediction.status === "lost"
                ? "text-red"
                : prediction.status === "cancelled"
                ? "text-ink-dim"
                : ""
            }`}
          >
            {prediction.status === "lost"
              ? `-${formatTL(prediction.stake)}`
              : prediction.status === "cancelled"
              ? `+${formatTL(prediction.stake)}`
              : formatTL(prediction.status === "won" ? (prediction.payout ?? 0) : potential)}
          </div>
        </div>
      </div>

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
                      : prediction.status === "cancelled"
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
