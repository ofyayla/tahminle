import Image from "next/image";
import Link from "next/link";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { getChoiceLabel } from "@/lib/markets";
import { formatTL } from "@/lib/format";
import type { CommunityFeedItem } from "@/lib/data";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}s önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

export default function CommunityFeed({
  items,
  viewAllHref,
}: {
  items: CommunityFeedItem[];
  // Only the preview on /siralama links out to the full feed page — the full
  // feed page itself renders this same component with no link back to itself.
  viewAllHref?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <h2 className="font-display text-xl">Topluluk Akışı</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs font-bold text-gold">
            Tümünü gör
          </Link>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-dim">Grubun içindeki taraftarlar hangi maça ne oynadı.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
          Henüz kimse tahmin yapmadı — ilk sen ol.
        </div>
      ) : (
        <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card">
          {items.map((item) => {
            const meta = item.favoriteTeam ? TEAM_META[item.favoriteTeam as TeamCode] : null;
            const choiceText = getChoiceLabel(item, item.market, item.choice);

            return (
              <div key={item.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
                  {meta ? (
                    <Image src={meta.logo} alt={meta.name} width={32} height={32} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-[9px] text-ink-dim">
                      {item.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px]">
                      <span className="font-bold">{item.displayName}</span>
                      {item.isYou && <span className="text-gold"> (Sen)</span>}
                      <span className="text-ink-dim"> · {choiceText}</span>
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-ink-faint">{timeAgo(item.at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-ink-faint">{item.homeTeam} – {item.awayTeam}</span>
                    <span className="flex-shrink-0 font-display text-xs text-ink">{formatTL(item.stake)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
