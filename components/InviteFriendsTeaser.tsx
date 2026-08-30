"use client";

import { useState } from "react";
import InviteFriendsCard from "./InviteFriendsCard";
import type { MyLeague } from "@/lib/leagues";

// Sits directly under the Maç Günü hero — collapsed by default, expands
// in place to InviteFriendsCard's representative ranking visual rather than
// navigating away immediately. Mirrors mobile/app/(tabs)/index.tsx's
// "Arkadaşlarını Davet Et" teaser exactly, including moving here from what
// used to be a static row on Hesabım.
export default function InviteFriendsTeaser({
  myLeagues,
  referralCode,
}: {
  myLeagues: MyLeague[];
  referralCode: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-gold/25 bg-gold/[0.05]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-gold/[0.15]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gold">
            <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Arkadaşlarını Davet Et</p>
          <p className="mt-0.5 text-xs text-ink-dim">
            {myLeagues.length > 0
              ? "Katılan her arkadaşınla ikinize de ₺100 bonus."
              : "Kendi ligini kur, katılan her arkadaşınla ikinize de ₺100 bonus."}
          </p>
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
        <div className="border-t border-gold/20 p-3.5">
          <InviteFriendsCard league={myLeagues[0] ?? null} referralCode={referralCode} />
        </div>
      )}
    </section>
  );
}
