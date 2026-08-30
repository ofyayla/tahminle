"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReceivedGiftDTO } from "@/lib/walletTypes";
import ReceivedGiftBox from "./ReceivedGiftBox";

// Arriving gifts are the one thing on this page worth interrupting for, so
// they get their own gold-bordered card right under the balance instead of
// sharing a collapsed panel with the send-a-gift form. Renders nothing when
// there is nothing to open — the section simply isn't there most weeks.
export default function GiftInbox({ received }: { received: ReceivedGiftDTO[] }) {
  const router = useRouter();
  // Opening a gift flips it to `opened` on the next refresh, which would
  // drop it out of this card the instant the reveal lands. Anything opened
  // while the page has been up stays until the user navigates away.
  const [revealed, setRevealed] = useState<string[]>([]);

  const shown = received.filter((g) => !g.opened || revealed.includes(g.id));
  if (shown.length === 0) return null;

  const waiting = shown.filter((g) => !g.opened).length;

  return (
    <section className="rounded-2xl border border-gold/35 bg-gold/5 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base">{waiting > 0 ? "Sana hediye var" : "Kuponun hazır"}</div>
          <div className="text-xs text-ink-dim">
            {waiting > 0 ? `${waiting} sürpriz kupon seni bekliyor` : "Sonuç maç bitince bakiyene işlenir"}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {shown.map((g) => (
          <ReceivedGiftBox
            key={g.id}
            gift={g}
            onOpened={(id) => {
              setRevealed((r) => (r.includes(id) ? r : [...r, id]));
              router.refresh();
            }}
          />
        ))}
      </div>
    </section>
  );
}
