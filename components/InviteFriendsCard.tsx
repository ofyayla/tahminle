import Link from "next/link";

// A sample table rather than a blank "henüz kimse yok" — the pitch is what
// the screen looks like once friends are in it, shown with fabricated rows
// (not skeletons — a filled-in scene reads as a promise, a skeleton just
// reads as "still loading"). Mirrors mobile/components/InviteFriendsCard.tsx.
const SAMPLE_ROWS = [
  { rank: "🥇", name: "Sen", net: "+₺450" },
  { rank: "🥈", name: "Arkadaşın", net: "+₺120" },
  { rank: "🥉", name: "Arkadaşın", net: "−₺80" },
];

// Shown in the Sıralama page's "Arkadaşlarım" tab when the account has no
// friend league yet. The entry point used to be a small 👥 card buried under
// the global board; this is the tab's entire content instead, so the pitch
// gets the same weight the feature is supposed to have.
export default function InviteFriendsCard() {
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
      <p className="mt-2.5 text-[11px] text-gold-dim">Katılan her arkadaşınla ikinize de ₺100 bonus.</p>
    </div>
  );
}
