import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueDetail } from "@/lib/leagues";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import CopyCodeButton from "@/components/CopyCodeButton";
import LeagueAdminPanel from "@/components/LeagueAdminPanel";

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const league = await getLeagueDetail(id, user.id);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section className="flex items-center gap-3">
        <Link
          href="/siralama/ligler"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink-dim"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Arkadaş Ligi</p>
          <h1 className="truncate font-display text-3xl">{league?.name ?? "Lig bulunamadı"}</h1>
        </div>
      </section>

      {!league ? (
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
          Bu lig bulunamadı ya da üyesi değilsin.
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-border bg-card p-4">
            <div className="text-sm text-ink-dim">
              <span className="font-bold text-ink">{league.memberCount}</span> üye
              {league.isOwner && <span> · Sahibi sensin</span>}
            </div>
            <CopyCodeButton code={league.inviteCode} />
          </section>

          <section>
            <LeaderboardBoard week={league.week} season={league.season} />
          </section>

          <section>
            <LeagueAdminPanel league={league} />
          </section>
        </>
      )}
    </div>
  );
}
