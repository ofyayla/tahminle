"use client";

import { useMemo, useState } from "react";
import { formatDateRange, formatTL } from "@/lib/format";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const CHART_H = 132; // bar plotting area, in px
const MAX_BAR = 58; // tallest a bar can grow either way from the baseline
const MIN_BAR = 10; // so a small but non-zero week is still visible

// Personal net-kâr form graph — one tappable column per week, growing up
// (green, kâr) or down (red, zarar) from a zero baseline. Selecting a week
// reveals its exact figure and date range in the readout above. Mirrors the
// mobile FormChart.tsx.
export default function FormChart({ points }: { points: { weekStart: string; net: number }[] }) {
  const [selected, setSelected] = useState(points.length - 1);

  // New data (a different week count) — snap the selection back to the latest
  // week during render, per React's "adjust state on prop change" pattern.
  const [prevLen, setPrevLen] = useState(points.length);
  if (prevLen !== points.length) {
    setPrevLen(points.length);
    setSelected(points.length - 1);
  }

  const maxAbs = useMemo(() => Math.max(1, ...points.map((p) => Math.abs(p.net))), [points]);

  if (points.length === 0) return null;

  const activeIdx = Math.min(Math.max(selected, 0), points.length - 1);
  const active = points[activeIdx];
  const activeIsLast = activeIdx === points.length - 1;
  const activeStart = new Date(active.weekStart);
  const activeRange = formatDateRange(activeStart, new Date(activeStart.getTime() + WEEK_MS));
  const toneClass = active.net > 0 ? "text-green" : active.net < 0 ? "text-red" : "text-ink-dim";
  const tag = active.net > 0 ? "Kâr" : active.net < 0 ? "Zarar" : "Nötr";

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-ink-dim">
            {activeRange}
            {activeIsLast ? "  ·  bu hafta" : ""}
          </div>
          <div className={`font-display text-2xl ${toneClass}`}>
            {active.net > 0 ? "+" : active.net < 0 ? "−" : ""}
            {formatTL(Math.abs(active.net))}
          </div>
        </div>
        <div
          className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${toneClass} ${
            active.net > 0
              ? "border-green/40 bg-green/10"
              : active.net < 0
                ? "border-red/40 bg-red/10"
                : "border-card-border bg-bg-elevated"
          }`}
        >
          {tag}
        </div>
      </div>

      <div className="relative flex gap-1.5" style={{ height: CHART_H }}>
        <div className="absolute inset-x-0 top-1/2 h-px bg-card-border" />
        {points.map((p, i) => {
          const isActive = i === activeIdx;
          const ratio = Math.abs(p.net) / maxAbs;
          const h = p.net === 0 ? 3 : Math.max(MIN_BAR, ratio * MAX_BAR);
          const color = p.net === 0 ? "var(--ink-faint)" : p.net > 0 ? "var(--green)" : "var(--red)";

          return (
            <button
              key={p.weekStart}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={isActive}
              aria-label={`${formatDateRange(
                new Date(p.weekStart),
                new Date(new Date(p.weekStart).getTime() + WEEK_MS)
              )}: ${p.net >= 0 ? "artı" : "eksi"} ${formatTL(Math.abs(p.net))}`}
              className="group relative h-full flex-1"
            >
              {isActive && <span className="absolute inset-y-0 -inset-x-1 rounded-lg bg-white/[0.06]" />}
              <span
                className={`absolute inset-x-0 transition-opacity ${
                  p.net >= 0 ? "bottom-1/2 rounded-t-[3px]" : "top-1/2 rounded-b-[3px]"
                } ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"}`}
                style={{ height: h, backgroundColor: color }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {points.map((p, i) => {
          const isActive = i === activeIdx;
          const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "Europe/Istanbul" }).format(
            new Date(p.weekStart)
          );
          return (
            <button
              key={`${p.weekStart}-label`}
              type="button"
              onClick={() => setSelected(i)}
              className={`flex-1 text-center text-[10px] ${
                isActive ? "font-bold text-gold" : "text-ink-faint"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[10px] text-ink-faint">
        Bir haftaya dokun · en yüksek {formatTL(maxAbs)}
      </p>
    </div>
  );
}
