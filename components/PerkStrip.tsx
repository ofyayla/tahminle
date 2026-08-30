"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserPerkStatus } from "@/lib/perks";

// The perks themselves are used where they apply — Çifte Kasa from the kasa
// card, Sigorta from a prediction — so all this needs to do is answer "what
// do I still have?". One line closed, two explanations open.
export default function PerkStrip({ perks }: { perks: UserPerkStatus }) {
  const [open, setOpen] = useState(false);
  const remaining = (perks.doubleKasa.available ? 1 : 0) + (perks.insurance.available ? 1 : 0);

  return (
    <section className="rounded-xl border border-card-border bg-card px-3.5 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 text-left">
        <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-gold/[0.12]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 ${remaining > 0 ? "text-gold" : "text-ink-faint"}`}>
            <path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.6L12 3z" />
          </svg>
        </div>
        <span className="flex-1 text-sm font-bold">Jokerlerim</span>
        <span className={`text-xs font-bold ${remaining > 0 ? "text-gold" : "text-ink-faint"}`}>
          {remaining > 0 ? `${remaining} hak` : "Hakkın kalmadı"}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`h-3.5 w-3.5 flex-shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-card-border pt-3">
          <PerkRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
              </svg>
            }
            name="Çifte Kasa"
            available={perks.doubleKasa.available}
            note="Haftalık kasanı ikiye katlar. Yukarıdaki kasa kartından kullanabilirsin."
          />
          <PerkRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            name="Sigorta"
            available={perks.insurance.available}
            note="Kaybeden bir tahmininin tutarını geri alırsın."
            actionHref="/tahminler"
            actionLabel="Tahminler'den bir tahmine uygula"
          />
        </div>
      )}
    </section>
  );
}

function PerkRow({
  icon,
  name,
  available,
  note,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode;
  name: string;
  available: boolean;
  note: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <div className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated ${available ? "text-gold" : "text-ink-faint"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${available ? "" : "text-ink-faint"}`}>{name}</span>
          {!available && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Bu sezon kullanıldı</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">
          {available ? note : "Sezonluk hakkın harcandı."}
        </p>
        {available && actionHref && actionLabel && (
          // A real link, not a chip that looks like a disabled button.
          <Link href={actionHref} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-gold">
            {actionLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
              <path d="M4 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
