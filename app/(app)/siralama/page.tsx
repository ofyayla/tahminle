import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";
import { PER_MATCH_CAP, WEEKLY_BUDGET } from "@/lib/season";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import CommunityFeed from "@/components/CommunityFeed";
import InfoAccordion from "@/components/InfoAccordion";

export default async function SiralamaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [{ week, season }, feed] = await Promise.all([
    getLeaderboard(user.id),
    getCommunityFeed(user.id),
  ]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi</p>
        <h1 className="font-display text-3xl">Sıralama</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Net kârına göre sıralanıyorsun. Bakiyen ne kadar büyük olursa olsun herkesin kasası aynı.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link
          href="/siralama/ligler"
          className="flex items-center gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 transition-colors hover:border-gold/40"
        >
          <span className="text-lg">👥</span>
          <span className="text-xs font-bold">Arkadaş Ligleri</span>
        </Link>
        <Link
          href="/siralama/arsiv"
          className="flex items-center gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 transition-colors hover:border-gold/40"
        >
          <span className="text-lg">🏆</span>
          <span className="text-xs font-bold">Sezon Arşivi</span>
        </Link>
      </section>

      <section>
        <LeaderboardBoard week={week} season={season} />
      </section>

      <InfoAccordion title="Sıralama nasıl hesaplanır?" subtitle="Haftalık kasa ve net kâr" defaultOpen={false}>
        Sıralamanın birimi puan değil, <span className="font-bold text-ink">lira</span> — kazandığın
        tutar eksi yatırdığın tutar. Bir maç haftasında kendi tahminlerine yatırabileceğin toplam tutar{" "}
        <span className="font-bold text-ink">₺{WEEKLY_BUDGET}</span> ile, tek bir maça yatırabileceğin
        tutar ise <span className="font-bold text-ink">₺{PER_MATCH_CAP}</span> ile sınırlı — bu yüzden
        yüksek bakiye sıralamada avantaj sağlamaz, herkes aynı kasayla oynar. Hediye edilen sürpriz
        kuponlar seçimi sana ait olmadığı için sıralamaya girmez. Haftalık sıralama her Pazartesi
        sıfırlanır; sezonluk sıralama son 4 haftanın toplamıdır ve sezon sonunda sıfırlanır.
      </InfoAccordion>

      <section>
        <CommunityFeed items={feed} />
      </section>
    </div>
  );
}
