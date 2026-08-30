import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import { getMyChampionCounts } from "@/lib/archive";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import LogoutButton from "@/components/LogoutButton";
import AccountSettings from "@/components/AccountSettings";

export default async function HesabimPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [{ week }, titles] = await Promise.all([getLeaderboard(user.id), getMyChampionCounts(user.id)]);
  const { you, totalPlayers } = week;
  const meta = user.favoriteTeam ? TEAM_META[user.favoriteTeam as TeamCode] : null;
  const hasTitles = titles.weeklyCount > 0 || titles.seasonCount > 0;

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Hesap Kontrolü</p>
        <h1 className="font-display text-3xl">Hesabım</h1>
      </section>

      <section
        className="relative overflow-hidden rounded-3xl border p-5 text-center"
        style={{ borderColor: meta ? `${meta.color}66` : "var(--card-border)" }}
      >
        {meta && (
          <>
            <Image
              src={meta.banner}
              alt={meta.name}
              fill
              className="object-cover opacity-35"
              style={{ objectPosition: "center 30%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-bg" />
          </>
        )}

        <div className="relative flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
            {meta ? (
              <Image src={meta.logo} alt={meta.name} width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl text-ink-dim">{user.displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <h2 className="font-display text-xl">{user.displayName}</h2>
          <p className="mt-1 text-sm text-ink-dim">{user.email}</p>
          {you && (
            <div className="mt-3 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs font-bold text-gold">
              Sıralamada #{you.rank} · {totalPlayers} taraftar arasında
            </div>
          )}
          {hasTitles && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {titles.seasonCount > 0 && (
                <div className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">
                  🏆 {titles.seasonCount} sezon birincisi
                </div>
              )}
              {titles.weeklyCount > 0 && (
                <div className="rounded-full border border-card-border bg-bg-elevated px-3 py-1 text-[11px] font-bold text-ink-dim">
                  🏆 {titles.weeklyCount} hafta birincisi
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Link
        href="/siralama/ligler"
        className="flex items-center gap-3 rounded-2xl border border-gold/35 bg-gold/[0.05] p-4 transition-colors hover:border-gold/60"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold/[0.15]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gold">
            <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Arkadaşlarını Davet Et</p>
          <p className="mt-0.5 text-xs text-ink-dim">Bir lig kur, katılan her arkadaşınla ikinize de ₺100 bonus.</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 flex-shrink-0 text-ink-faint">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      <AccountSettings displayName={user.displayName} email={user.email} hasPassword={user.passwordHash != null} />

      <section>
        <LogoutButton full />
      </section>

      <p className="pb-2 text-center text-xs text-ink-faint">
        Gerçek para içermez · Tüm bakiyeler ve sonuçlar sanaldır.
      </p>
    </div>
  );
}
