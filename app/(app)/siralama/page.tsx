import { getCurrentUser } from "@/lib/auth";
import { getCommunityFeed, getLeaderboard } from "@/lib/data";
import { getMyLeagues } from "@/lib/leagues";
import SiralamaBoard from "@/components/SiralamaBoard";

export default async function SiralamaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [{ week, season }, feed, myLeagues] = await Promise.all([
    getLeaderboard(user.id),
    getCommunityFeed(user.id),
    getMyLeagues(user.id),
  ]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Taraftar Ligi</p>
        <h1 className="font-display text-3xl">Sıralama</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Net kârına göre sıralanıyorsun — kazandığın tutar eksi yatırdığın tutar.
        </p>
      </section>

      <SiralamaBoard week={week} season={season} feed={feed} myLeagues={myLeagues} />
    </div>
  );
}
