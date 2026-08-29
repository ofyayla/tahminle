import { getCurrentUser } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";
import { formatMatchDate } from "@/lib/format";
import { MAX_POINTS_PER_PREDICTION, POINTS_PER_ODDS_UNIT } from "@/lib/scoring";
import LeaderboardList from "@/components/LeaderboardList";
import CommunityFeed from "@/components/CommunityFeed";
import InfoAccordion from "@/components/InfoAccordion";

export default async function SiralamaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [{ ranked, you, totalPlayers, seasonEnd }, feed] = await Promise.all([
    getLeaderboard(user.id),
    getCommunityFeed(user.id),
  ]);

  // The season closes at Monday 00:00, i.e. the very start of the next week —
  // label it with the Sunday that's actually the last playing day.
  const lastDay = new Date(new Date(seasonEnd).getTime() - 1);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi</p>
        <h1 className="font-display text-3xl">Sıralama</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Bu haftanın doğru tahmin puanlarına göre sıralanıyorsun. Bakiye değil, isabet konuşuyor.
        </p>
      </section>

      {you && (
        <section className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gold-dim">Senin Sıran</div>
              <div className="font-display text-2xl">#{you.rank}</div>
              <div className="mt-1 text-xs text-ink-dim">{totalPlayers} taraftar arasında</div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-gold">{you.points}</div>
              <div className="text-xs text-ink-dim">puan</div>
              <div className="mt-1 text-xs text-ink-dim">
                {you.total > 0 ? `${you.correct}/${you.total} · %${you.accuracy}` : "tahmin yok"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-gold/20 pt-3 text-[11px] text-ink-dim">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gold">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
            </svg>
            Sezon {formatMatchDate(lastDay)} akşamı kapanıyor, Pazartesi sıfırlanır.
          </div>
        </section>
      )}

      <section>
        <LeaderboardList rows={ranked} />
      </section>

      <InfoAccordion title="Puanlar nasıl hesaplanır?" subtitle="Haftalık sezon ve isabet puanı">
        Doğru bilinen her tahmin,{" "}
        <span className="font-bold text-ink">kilitlenen oranın {POINTS_PER_ODDS_UNIT} katı</span> kadar
        puan kazandırır — 2.40 oranlı bir tahmin {2.4 * POINTS_PER_ODDS_UNIT} puan eder. Yanlış tahmin
        puan kaybettirmez, sadece isabet yüzdeni düşürür. Ne kadar sanal bakiye yatırdığın puanı
        etkilemez, bu yüzden yüksek bakiye sıralamada avantaj sağlamaz. Tek bir tahminden en fazla{" "}
        <span className="font-bold text-ink">{MAX_POINTS_PER_PREDICTION} puan</span> alınabilir. Hediye
        edilen sürpriz kuponlar seçimi sana ait olmadığı için sıralamaya girmez. Sezon her Pazartesi
        00:00&apos;da sıfırlanır.
      </InfoAccordion>

      <section>
        <CommunityFeed items={feed} />
      </section>
    </div>
  );
}
