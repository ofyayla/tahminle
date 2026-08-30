"use client";

import Link from "next/link";
import type { MyLeague } from "@/lib/leagues";

// A sample table rather than a blank "henüz kimse yok" — the pitch is what
// the screen looks like once friends are in it, shown with fabricated rows
// (not skeletons — a filled-in scene reads as a promise, a skeleton just
// reads as "still loading"). Kept the same whether or not the account
// already has a league — only the copy and CTA below it change; the visual
// itself is the "representative ranking" and stays constant. Mirrors
// mobile/components/InviteFriendsCard.tsx.
const SAMPLE_ROWS = [
  { rank: "🥇", name: "Sen", net: "+₺450" },
  { rank: "🥈", name: "Arkadaşın", net: "+₺120" },
  { rank: "🥉", name: "Arkadaşın", net: "−₺80" },
];

// Mirrors mobile/lib/referral.ts's inviteMessage/inviteLink shape.
function inviteMessage(leagueName: string, link: string): string {
  return `Seni "${leagueName}" Taraftar Ligi'ne çağırıyorum ⚽️\nAynı kasa, aynı kurallar — bakalım kim daha iyi tahmin ediyor.\n\n${link}`;
}

// Used two places: full-width and always open in the Sıralama page's
// "Arkadaşlarım" empty state, and as the expandable body of the Maç Günü
// hero's "Arkadaşlarını Davet Et" teaser (components/InviteFriendsTeaser.tsx).
//
// `league` is the account's own first league (from getMyLeagues), if any —
// when present this pitches growing *that* league (real share link, direct
// share) instead of the "kur" pitch aimed at someone with nothing yet.
export default function InviteFriendsCard({
  league,
  referralCode,
}: {
  league?: MyLeague | null;
  referralCode?: string | null;
}) {
  async function shareExistingLeague() {
    if (!league) return;
    const link = `${window.location.origin}/lig/${league.inviteCode}${referralCode ? `?ref=${referralCode}` : ""}`;
    const message = inviteMessage(league.name, link);
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
    } catch {
      // Nothing left to fall back to.
    }
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-card-border bg-card p-6 text-center">
      <div className="relative mb-4 w-full overflow-hidden rounded-xl bg-bg-elevated">
        {SAMPLE_ROWS.map((r, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i > 0 ? "border-t border-card-border" : ""}`}>
            <span className="w-5 text-sm">{r.rank}</span>
            <span className="flex-1 text-left text-xs font-semibold">{r.name}</span>
            <span className={`font-display text-xs ${r.net.startsWith("−") ? "text-red" : "text-green"}`}>{r.net}</span>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-card/30" />
      </div>

      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gold/[0.12]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gold">
          <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8" />
        </svg>
      </div>

      {league ? (
        <>
          <p className="font-display text-lg">&quot;{league.name}&quot;ni Büyüt</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            Ligindeki herkes aynı kasada oynuyor. Bir arkadaşını daha ekle, rekabet kızışsın.
          </p>
          <button
            type="button"
            onClick={shareExistingLeague}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-bold text-bg transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M12 15V3M8 7l4-4 4 4" />
              <path d="M4 13v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
            </svg>
            Arkadaşını Davet Et
          </button>
        </>
      ) : (
        <>
          <p className="font-display text-lg">Kendi ligini kur</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            Global sıralama binlerce kişi arasında kaybolur. Arkadaşlarınla aynı kasada, sadece aranızda bir
            sıralama kur — kim daha iyi tahmin ediyor, gerçekten görün.
          </p>
          <Link
            href="/siralama/ligler?mode=create"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-bold text-bg transition-opacity hover:opacity-90"
          >
            Lig Kur, Arkadaşlarını Davet Et
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </>
      )}
      <p className="mt-2.5 text-[11px] text-gold-dim">Katılan her arkadaşınla ikinize de ₺100 bonus.</p>
    </div>
  );
}
