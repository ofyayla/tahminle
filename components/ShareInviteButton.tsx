"use client";

import { useState } from "react";

// Mirrors mobile/lib/referral.ts's inviteMessage — same link shape, same
// pitch, so a friend gets the same message whether it came from the phone
// app or this web dashboard.
function inviteMessage(leagueName: string, link: string): string {
  return `Seni "${leagueName}" Taraftar Ligi'ne çağırıyorum ⚽️\nAynı fikstür, aynı kurallar — bakalım kim daha iyi tahmin ediyor.\n\n${link}`;
}

export default function ShareInviteButton({
  leagueName,
  inviteCode,
  referralCode,
}: {
  leagueName: string;
  inviteCode: string;
  referralCode: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const link = `${window.location.origin}/lig/${inviteCode}?ref=${referralCode}`;
    const message = inviteMessage(leagueName, link);

    // navigator.share opens the OS's own share sheet where available
    // (mobile browsers, most modern desktop browsers) — falls back to a
    // clipboard copy everywhere else, same graceful-degradation CopyCodeButton
    // already uses for the raw code.
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // Cancelled or unsupported mid-call — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Nothing left to fall back to — the link is still visible via
      // CopyCodeButton right next to this one.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-bg transition-opacity hover:opacity-90"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path d="M12 15V3M8 7l4-4 4 4" />
        <path d="M4 13v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
      </svg>
      {copied ? "Kopyalandı" : "Davet Et"}
    </button>
  );
}
