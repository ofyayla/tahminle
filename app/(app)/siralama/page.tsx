import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import LeaderboardList from "@/components/LeaderboardList";

export default async function SiralamaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { ranked, you, totalPlayers } = await getLeaderboard(user.id);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi</p>
        <h1 className="font-display text-3xl">Sıralama</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Sanal bakiyene göre diğer taraftarlar arasındaki yerin. Tutarlar herkes için gizli — sadece sıra görünür.
        </p>
      </section>

      {you && (
        <section className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gold-dim">Senin Sıran</div>
              <div className="font-display text-2xl">#{you.rank}</div>
            </div>
            <div className="text-right text-sm text-ink-dim">
              {totalPlayers} taraftar arasında
            </div>
          </div>
        </section>
      )}

      <section>
        <LeaderboardList rows={ranked} />
      </section>
    </div>
  );
}
