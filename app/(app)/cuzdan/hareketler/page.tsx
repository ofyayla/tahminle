import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRecentActivity } from "@/lib/data";
import ActivityFeed from "@/components/ActivityFeed";

export default async function TumHareketlerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const activity = await getRecentActivity(user.id, 200);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section className="flex items-center gap-3">
        <Link
          href="/cuzdan"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink-dim"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cüzdan Kontrolü</p>
          <h1 className="font-display text-3xl">Tüm Hareketler</h1>
        </div>
      </section>

      <ActivityFeed items={activity} />
    </div>
  );
}
