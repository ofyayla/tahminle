"use client";

import { useState } from "react";

// Renders the model's note. It comes back as a short paragraph followed by
// "•" bullets, so the bullets are split out rather than dumped as one blob.
function renderNote(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const paragraphs = lines.filter((l) => !l.startsWith("•"));
  const bullets = lines.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, ""));

  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-2" : undefined}>
          {p}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-gold" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AiAnalysisPanel({ analysis }: { analysis: string | null }) {
  const [open, setOpen] = useState(false);

  if (!analysis) return null;

  return (
    <div className="mt-3 border-t border-card-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
          </svg>
        </span>
        <span className="flex-1 text-xs font-bold uppercase tracking-wide text-ink-dim">
          Maç Analizi
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 flex-shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-2.5 rounded-xl bg-bg-elevated p-3.5 text-sm leading-relaxed text-ink-dim">
          {renderNote(analysis)}
          <p className="mt-3 flex items-start gap-1.5 border-t border-card-border pt-2.5 text-[11px] text-ink-faint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-px h-3 w-3 flex-shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Yapay zeka tarafından, maçın bahis oranlarına dayanılarak yazıldı. Tahmin
            tavsiyesi değildir.
          </p>
        </div>
      )}
    </div>
  );
}
