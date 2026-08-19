"use client";

import { useState } from "react";

export default function InfoAccordion({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base">{title}</div>
          <div className="text-xs text-ink-dim">{subtitle}</div>
        </div>
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
        <div className="mt-3 rounded-xl bg-bg-elevated p-3.5 text-sm leading-relaxed text-ink-dim">
          {children}
        </div>
      )}
    </div>
  );
}
