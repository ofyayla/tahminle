"use client";

import { useState } from "react";
import { formatOdds } from "@/lib/format";
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

function MarketPair({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number | null }[];
}) {
  const visible = items.filter((i) => i.value != null);
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">{title}</div>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((i) => (
          <div key={i.label} className="rounded-lg border border-card-border bg-card px-2 py-2 text-center">
            <div className="text-[10px] text-ink-faint">{i.label}</div>
            <div className="font-display text-sm">{formatOdds(i.value!)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExtraMarketsPanel({ extraOdds }: { extraOdds: MatchDTO["extraOdds"] }) {
  const [open, setOpen] = useState(false);

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
          <MarketPair
            title="2.5 Gol Alt/Üst"
            items={[
              { label: "Alt", value: extraOdds.under25 },
              { label: "Üst", value: extraOdds.over25 },
            ]}
          />
          <MarketPair
            title="Karşılıklı Gol"
            items={[
              { label: "Var", value: extraOdds.bttsYes },
              { label: "Yok", value: extraOdds.bttsNo },
            ]}
          />
          <MarketPair
            title="Çifte Şans"
            items={[
              { label: "1-X", value: extraOdds.dc1X },
              { label: "1-2", value: extraOdds.dc12 },
              { label: "X-2", value: extraOdds.dcX2 },
            ]}
          />

          {otherEntries.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">Diğer Marketler</div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-card-border bg-card p-2">
                {otherEntries.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-ink-dim">{label}</span>
                    <span className="flex-shrink-0 font-display text-ink">{formatOdds(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-ink-faint">
            Bu oranlar bilgi amaçlıdır — sanal tahminler yalnızca 1 / X / 2 üzerinden kilitlenir.
          </p>
        </div>
      )}
    </div>
  );
}
