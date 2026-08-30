import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyLeagues } from "@/lib/leagues";
import LeagueActions from "@/components/LeagueActions";

export default async function LiglerPage({
  searchParams,
}: {
  // InviteFriendsCard's "Lig Kur" CTA links here with ?mode=create so the
  // create form is already open — mirrors mobile/app/ligler.tsx.
  searchParams: Promise<{ mode?: "create" | "join" }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { mode } = await searchParams;
  const leagues = await getMyLeagues(user.id);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section className="flex items-center gap-3">
        <Link
          href="/siralama"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink-dim"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi</p>
          <h1 className="font-display text-3xl">Arkadaş Ligleri</h1>
        </div>
      </section>

      <p className="text-sm text-ink-dim">
        Davet kodunla arkadaşlarınla özel bir sıralama kur — aynı net kâr hesabı, sadece aranızda.
      </p>

      <section>
        {leagues.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
            <p>Henüz bir lige katılmadın.</p>
            <p className="mt-1.5 text-xs text-ink-faint">Bir lig kur ya da bir davet koduyla katıl — aşağıdan başla.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leagues.map((l) => (
              <Link
                key={l.id}
                href={`/siralama/ligler/${l.id}`}
                className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4 transition-colors hover:border-gold/40"
              >
                <div>
                  <div className="text-sm font-bold">{l.name}</div>
                  <div className="text-[11px] text-ink-dim">
                    {l.memberCount} üye{l.isOwner ? " · Sahibi sensin" : ""}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 flex-shrink-0 text-ink-faint">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </section>

      <LeagueActions initialMode={mode ?? null} />
    </div>
  );
}
