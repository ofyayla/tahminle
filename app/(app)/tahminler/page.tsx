import { getCurrentUser } from "@/lib/auth";
import { getPerformanceStats, getPredictions, syncMatchState } from "@/lib/data";
import { formatTL } from "@/lib/format";
import PredictionsTabs from "@/components/PredictionsTabs";
import type { PredictionDTO } from "@/lib/predictionTypes";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export default async function TahminlerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await syncMatchState();

  const [openRaw, settledRaw, stats] = await Promise.all([
    getPredictions(user.id, "open"),
    getPredictions(user.id, "settled"),
    getPerformanceStats(user.id),
  ]);

  const toDTO = (p: (typeof openRaw)[number]): PredictionDTO => ({
    id: p.id,
    market: p.market as "1X2" | "OU25" | "BTTS" | "DC" | "EXTRA",
    choice: p.choice,
    stake: p.stake,
    oddsAtPick: p.oddsAtPick,
    status: p.status as "open" | "won" | "lost",
    payout: p.payout,
    createdAt: p.createdAt.toISOString(),
    settledAt: p.settledAt ? p.settledAt.toISOString() : null,
    match: {
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      kickoff: p.match.kickoff.toISOString(),
      status: p.match.status,
      result: p.match.result,
      resultOver25: p.match.resultOver25,
      resultBtts: p.match.resultBtts,
      homeScore: p.match.homeScore,
      awayScore: p.match.awayScore,
    },
  });

  const open = openRaw.map(toDTO);
  const settled = settledRaw.map(toDTO);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Sanal Performans</p>
        <h1 className="font-display text-3xl">Tahminler</h1>
        <p className="mt-2 text-sm text-ink-dim">Maç günündeki seçimlerini takip et, sonuçlarını birlikte değerlendir.</p>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Son 30 Gün</div>
            <div className="font-display text-lg">Sanal oyun performansın</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M3 17l6-6 4 4 8-8M15 3h6v6" /></svg>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-card-border">
          <div className="pr-2">
            <div className="font-display text-2xl">{stats.total}</div>
            <div className="text-[11px] text-ink-dim">tahmin</div>
          </div>
          <div className="px-2">
            <div className="font-display text-2xl text-green">{stats.correct}</div>
            <div className="text-[11px] text-ink-dim">doğru</div>
          </div>
          <div className="pl-2">
            <div className={`font-display text-2xl ${stats.netEffect >= 0 ? "text-gold" : "text-red"}`}>
              {stats.netEffect >= 0 ? "+" : ""}
              {formatTL(stats.netEffect)}
            </div>
            <div className="text-[11px] text-ink-dim">net sanal etki</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-bg-elevated px-3 py-2 text-xs text-ink-dim">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-green"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Gerçek para içermez · Tüm bakiyeler sanaldır.
        </div>
      </section>

      <PredictionsTabs open={open} settled={settled} />
    </div>
  );
}
