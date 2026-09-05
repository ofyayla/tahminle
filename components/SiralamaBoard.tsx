"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeaderboardBoard from "./LeaderboardBoard";
import CommunityFeed from "./CommunityFeed";
import InfoAccordion from "./InfoAccordion";
import InviteFriendsCard from "./InviteFriendsCard";
import type { CommunityFeedItem, LeaderboardScope } from "@/lib/data";
import type { LeagueDetail, MyLeague } from "@/lib/leagues";

// Owns the Arkadaşlarım/Herkes split — the segment control is the page's
// primary choice now, on equal footing, rather than a small 👥 card buried
// under the global board. Mirrors mobile/app/(tabs)/siralama.tsx exactly:
// same default (friends first if the account already has a league), same
// per-league picker for 2+ leagues, same fetch-on-demand for the active
// league's board.
export default function SiralamaBoard({
  week,
  season,
  feed,
  myLeagues,
}: {
  week: LeaderboardScope;
  season: LeaderboardScope;
  feed: CommunityFeedItem[];
  myLeagues: MyLeague[];
}) {
  const [mode, setMode] = useState<"friends" | "global">(myLeagues.length > 0 ? "friends" : "global");
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(myLeagues[0]?.id ?? null);
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetail | null>(null);
  // The id a fetch attempt most recently failed for — kept separate from
  // "loading" (derived below) rather than a boolean flag flipped inside the
  // effect: setting state synchronously at the top of an effect body forces
  // an extra render before the fetch even starts, which is exactly what
  // react-hooks/set-state-in-effect flags. Deriving "loading" from whether
  // the data on hand actually matches activeLeagueId sidesteps that.
  const [leagueDetailErrorFor, setLeagueDetailErrorFor] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "friends" || !activeLeagueId) return;
    let cancelled = false;
    fetch(`/api/leagues/${activeLeagueId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setLeagueDetail(data.league);
      })
      .catch(() => {
        if (!cancelled) setLeagueDetailErrorFor(activeLeagueId);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, activeLeagueId]);

  const leagueDetailFailed = activeLeagueId != null && leagueDetailErrorFor === activeLeagueId;

  return (
    <>
      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("friends")}
          className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-bold transition-colors ${
            mode === "friends" ? "border-gold bg-gold/10 text-gold" : "border-card-border bg-card text-ink-dim"
          }`}
        >
          <span>👥</span> Arkadaşlarım
        </button>
        <button
          type="button"
          onClick={() => setMode("global")}
          className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-bold transition-colors ${
            mode === "global" ? "border-gold bg-gold/10 text-gold" : "border-card-border bg-card text-ink-dim"
          }`}
        >
          <span>🌍</span> Herkes
        </button>
      </section>

      <Link href="/siralama/arsiv" className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink-dim hover:text-ink">
        🏆 Sezon Arşivi
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      {mode === "friends" ? (
        myLeagues.length === 0 ? (
          <InviteFriendsCard />
        ) : (
          <div className="flex flex-col gap-4">
            {myLeagues.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {myLeagues.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveLeagueId(l.id)}
                    className={`max-w-[180px] truncate rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                      activeLeagueId === l.id ? "border-gold bg-gold text-bg" : "border-card-border bg-card text-ink-dim"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}

            {leagueDetailFailed ? (
              <p className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
                Lig alınamadı, tekrar dener misin?
              </p>
            ) : !leagueDetail || leagueDetail.id !== activeLeagueId ? (
              <div className="animate-pulse space-y-2 rounded-2xl border border-card-border bg-card p-6">
                <div className="h-4 w-32 rounded bg-bg-elevated" />
                <div className="h-3 w-24 rounded bg-bg-elevated" />
              </div>
            ) : (
              <>
                <LeaderboardBoard week={leagueDetail.week} season={leagueDetail.season} />
                <Link
                  href={`/siralama/ligler/${leagueDetail.id}`}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-gold hover:opacity-80"
                >
                  Ligi yönet ve arkadaş davet et
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        )
      ) : (
        <>
          <section>
            <LeaderboardBoard week={week} season={season} />
          </section>

          <InfoAccordion title="Sıralama nasıl hesaplanır?" subtitle="Net kâr" defaultOpen={false}>
            Sıralamanın birimi puan değil, <span className="font-bold text-ink">lira</span> — kazandığın
            tutar eksi yatırdığın tutar. Yatırdığın tutarın tek sınırı sanal bakiyendir; haftalık ya da
            maç başına bir limit yok. Hediye edilen sürpriz kuponlar seçimi sana ait olmadığı için
            sıralamaya girmez. Haftalık sıralama her Salı sıfırlanır; sezonluk sıralama son 4 haftanın
            toplamıdır ve sezon sonunda sıfırlanır.
          </InfoAccordion>

          <section>
            <CommunityFeed items={feed} viewAllHref="/siralama/akis" />
          </section>
        </>
      )}
    </>
  );
}
