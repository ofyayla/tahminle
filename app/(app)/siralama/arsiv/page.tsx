import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getHallOfFame, getMyChampionCounts, getPersonalForm } from "@/lib/archive";
import { formatDateRange, formatTL } from "@/lib/format";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import FormChart from "@/components/FormChart";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function ArsivPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [hallOfFame, form, titles] = await Promise.all([
    getHallOfFame(),
    getPersonalForm(user.id),
    getMyChampionCounts(user.id),
  ]);

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
          <h1 className="font-display text-3xl">Sezon Arşivi</h1>
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-dim">Senin Formun</div>
        <p className="mb-3 text-xs text-ink-dim">Son {form.length} haftanın net kârı, bu hafta dahil.</p>
        <FormChart points={form} />
        {(titles.weeklyCount > 0 || titles.seasonCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-card-border pt-3">
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
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl">Sezon Şampiyonları</h2>
        <p className="mb-3 text-sm text-ink-dim">Her sezonun net kâr lideri.</p>
        {hallOfFame.season.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
            Henüz tamamlanan bir sezon yok.
          </div>
        ) : (
          <div className="space-y-2">
            {hallOfFame.season.map((s) => {
              const meta = s.favoriteTeam ? TEAM_META[s.favoriteTeam as TeamCode] : null;
              const start = new Date(s.seasonStart);
              return (
                <div key={s.seasonStart} className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-3.5">
                  <span className="text-xl">🏆</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {s.displayName} {meta && <span className="text-ink-dim">· {meta.name}</span>}
                    </div>
                    <div className="text-[11px] text-ink-dim">{formatDateRange(start, new Date(start.getTime() + 4 * WEEK_MS))}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-display text-sm ${s.net >= 0 ? "text-green" : "text-red"}`}>
                      {s.net >= 0 ? "+" : "−"}{formatTL(Math.abs(s.net))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl">Hafta Birincileri</h2>
        <p className="mb-3 text-sm text-ink-dim">Son {hallOfFame.weekly.length} haftanın şampiyonları.</p>
        {hallOfFame.weekly.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
            Henüz taçlanan bir hafta yok — Pazartesi 09:00&apos;da ilk şampiyon belli olacak.
          </div>
        ) : (
          <div className="space-y-2">
            {hallOfFame.weekly.map((w) => {
              const meta = w.favoriteTeam ? TEAM_META[w.favoriteTeam as TeamCode] : null;
              const start = new Date(w.weekStart);
              return (
                <div key={w.weekStart} className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated overflow-hidden">
                    {meta ? (
                      <Image src={meta.logo} alt={meta.name} width={36} height={36} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-[11px] text-ink-dim">{w.displayName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{w.displayName}</div>
                    <div className="text-[11px] text-ink-dim">{formatDateRange(start, new Date(start.getTime() + WEEK_MS))}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-display text-sm ${w.net >= 0 ? "text-green" : "text-red"}`}>
                      {w.net >= 0 ? "+" : "−"}{formatTL(Math.abs(w.net))}
                    </div>
                    <div className="text-[10px] text-ink-faint">+{formatTL(w.bonus)} prim</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
