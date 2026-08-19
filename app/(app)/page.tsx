import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard, getUpcomingMatches, getWalletSummary } from "@/lib/data";
import { formatTL, formatTime } from "@/lib/format";
import MatchBoard from "@/components/MatchBoard";
import type { MatchDTO } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { TEAM_META, type TeamCode } from "@/lib/teams";

export default async function MacGunuPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [matches, wallet, leaderboard, openPredictions] = await Promise.all([
    getUpcomingMatches(),
    getWalletSummary(user.id),
    getLeaderboard(user.id),
    prisma.prediction.findMany({
      where: { userId: user.id, status: "open" },
      select: { matchId: true, choice: true },
    }),
  ]);
  const predictionByMatchId = new Map(openPredictions.map((p) => [p.matchId, p.choice]));

  const matchDTOs: MatchDTO[] = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    league: m.league,
    kickoff: m.kickoff.toISOString(),
    oddsHome: m.oddsHome,
    oddsDraw: m.oddsDraw,
    oddsAway: m.oddsAway,
    prevOddsHome: m.prevOddsHome,
    prevOddsDraw: m.prevOddsDraw,
    prevOddsAway: m.prevOddsAway,
    status: m.status,
    hasOpenPrediction: predictionByMatchId.has(m.id),
    predictedChoice: (predictionByMatchId.get(m.id) as "1" | "X" | "2" | undefined) ?? null,
  }));

  const favMeta = user.favoriteTeam ? TEAM_META[user.favoriteTeam as TeamCode] : null;

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section
        className="relative overflow-hidden rounded-3xl border p-5"
        style={{ borderColor: favMeta ? `${favMeta.color}66` : "var(--card-border)" }}
      >
        {favMeta ? (
          <>
            <Image
              src={favMeta.banner}
              alt={favMeta.name}
              fill
              priority
              className="object-cover opacity-35"
              style={{ objectPosition: "center 30%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/75 to-bg" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 85% 0%, ${favMeta.color}33, transparent 45%)`,
              }}
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2440] via-[#111830] to-[#0a0d16]" />
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 15%, rgba(246,201,69,0.25), transparent 45%), radial-gradient(circle at 85% 0%, rgba(62,207,142,0.15), transparent 40%)",
              }}
            />
          </>
        )}

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2 rounded-full border border-card-border bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-ink-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Veri güncellendi: {formatTime(new Date())}
          </div>
          {favMeta ? (
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
              <Image src={favMeta.logo} alt={favMeta.name} width={64} height={64} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-black/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-ink-dim">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
          )}
        </div>

        <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          {favMeta ? `${favMeta.name} Kontrol Odası` : "Maç Günü Kontrol Odası"}
        </p>
        <h1 className="relative font-display text-3xl leading-tight mt-1">
          Bu hafta sahne senin.
        </h1>

        <div className="relative mt-5 flex flex-wrap items-stretch gap-2.5">
          <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-card-border bg-black/40 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 text-gold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Sanal Bakiye</div>
              <div className="font-display text-lg text-gold">{formatTL(wallet.total)}</div>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-card-border bg-black/40 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/20 text-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M8 20V10M13 20V4M18 20v-7" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Sıralama</div>
              <div className="font-display text-lg">
                #{leaderboard.you?.rank ?? "-"}
                <span className="ml-1 text-xs font-sans font-normal text-ink-dim">/ {leaderboard.totalPlayers}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Bugünkü Durum</div>
            <div className="font-display text-lg">Tahminlerin sahada</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M3 17l6-6 4 4 8-8" /></svg>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-card-border">
          <div className="pr-2">
            <div className="font-display text-2xl">{wallet.openCount}</div>
            <div className="text-[11px] text-ink-dim">açık tahmin</div>
          </div>
          <div className="px-2">
            <div className="font-display text-2xl text-red">{formatTL(wallet.lockedInOpen)}</div>
            <div className="text-[11px] text-ink-dim">riskte</div>
          </div>
          <div className="pl-2">
            <div className="font-display text-2xl text-green">{formatTL(wallet.potentialReturn)}</div>
            <div className="text-[11px] text-ink-dim">potansiyel getiri</div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-1 flex items-end justify-between">
          <h2 className="font-display text-xl">Sıradaki Maçlar</h2>
          <span className="text-xs font-semibold text-ink-faint">{matchDTOs.length} maç</span>
        </div>
        <p className="mb-3 text-sm text-ink-dim">Kulübünün maçını seç, sanal tahminini kur.</p>
        <MatchBoard matches={matchDTOs} available={wallet.available} />
      </section>
    </div>
  );
}
