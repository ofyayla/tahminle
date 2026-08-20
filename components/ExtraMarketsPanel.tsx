"use client";

import { useState } from "react";
import { formatOdds } from "@/lib/format";
import type { MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";

const KNOWN_LABEL_PATTERNS = [
  "1x2",
  "maç sonucu",
  "2.5 gol",
  "karşılıklı gol",
  "çifte şans",
];

function isKnownMarket(label: string): boolean {
  const lower = label.toLowerCase();
  return KNOWN_LABEL_PATTERNS.some((p) => lower.includes(p));
}

function MarketRow({
  title,
  market,
  disabled,
  selectedChoice,
  onPick,
  items,
}: {
  title: string;
  market: MarketCode;
  disabled: boolean;
  selectedChoice: string | null;
  onPick: (market: MarketCode, choice: string) => void;
  items: { label: string; choice: string; value: number | null }[];
}) {
  const visible = items.filter((i) => i.value != null);
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">{title}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((i) => {
          const selected = selectedChoice === i.choice;
          return (
            <button
              key={i.choice}
              type="button"
              disabled={disabled}
              onClick={() => onPick(market, i.choice)}
              className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                selected
                  ? "border-2 border-gold bg-gold/10"
                  : `border-card-border bg-card enabled:hover:border-gold ${disabled ? "opacity-40" : ""}`
              }`}
            >
              <div className={`text-[10px] ${selected ? "text-gold" : "text-ink-faint"}`}>{i.label}</div>
              <div className="font-display text-sm">{formatOdds(i.value!)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ExtraMarketsPanel({
  match,
  disabled,
  onPick,
}: {
  match: MatchDTO;
  disabled: boolean;
  onPick: (market: MarketCode, choice: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { extraOdds } = match;

  const structuredCount = [
    extraOdds.over25,
    extraOdds.under25,
    extraOdds.bttsYes,
    extraOdds.bttsNo,
    extraOdds.dc1X,
    extraOdds.dc12,
    extraOdds.dcX2,
  ].filter((v) => v != null).length;

  const otherEntries = extraOdds.extraMarkets
    ? Object.entries(extraOdds.extraMarkets).filter(([label]) => !isKnownMarket(label))
    : [];

  const totalCount = structuredCount + otherEntries.length;
  if (totalCount === 0) return null;

  const selectedFor = (market: MarketCode) =>
    match.predictedMarket === market ? match.predictedChoice : null;

  return (
    <div className="mt-3 border-t border-card-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-card-border bg-bg-elevated py-2.5 text-xs font-bold text-ink-dim transition-colors hover:text-gold"
      >
        {open ? (
          <>
            Daha Az Göster
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 rotate-180 transition-transform">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        ) : (
          <>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold/20 text-[10px] text-gold">+</span>
            {totalCount} Oran Daha
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 transition-transform">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <MarketRow
            title="2.5 Gol Alt/Üst"
            market="OU25"
            disabled={disabled}
            selectedChoice={selectedFor("OU25")}
            onPick={onPick}
            items={[
              { label: "Alt", choice: "UNDER", value: extraOdds.under25 },
              { label: "Üst", choice: "OVER", value: extraOdds.over25 },
            ]}
          />
          <MarketRow
            title="Karşılıklı Gol"
            market="BTTS"
            disabled={disabled}
            selectedChoice={selectedFor("BTTS")}
            onPick={onPick}
            items={[
              { label: "Var", choice: "YES", value: extraOdds.bttsYes },
              { label: "Yok", choice: "NO", value: extraOdds.bttsNo },
            ]}
          />
          <MarketRow
            title="Çifte Şans"
            market="DC"
            disabled={disabled}
            selectedChoice={selectedFor("DC")}
            onPick={onPick}
            items={[
              { label: "1-X", choice: "1X", value: extraOdds.dc1X },
              { label: "1-2", choice: "12", value: extraOdds.dc12 },
              { label: "X-2", choice: "X2", value: extraOdds.dcX2 },
            ]}
          />

          {otherEntries.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">
                Diğer Marketler ({otherEntries.length})
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-card-border bg-card p-2">
                {otherEntries.map(([label, value]) => {
                  const selected = match.predictedMarket === "EXTRA" && match.predictedChoice === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      onClick={() => onPick("EXTRA", label)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "border-gold bg-gold/10"
                          : `border-transparent enabled:hover:border-card-border enabled:hover:bg-bg-elevated ${disabled ? "opacity-40" : ""}`
                      }`}
                    >
                      <span className={selected ? "text-gold" : "text-ink-dim"}>{label}</span>
                      <span className="flex-shrink-0 font-display text-ink">{formatOdds(value)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-center text-[10px] text-ink-faint">
                Bu marketlerden birine dokunarak da tahminini kilitleyebilirsin.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
