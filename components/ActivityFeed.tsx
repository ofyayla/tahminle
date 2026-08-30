import Link from "next/link";
import { formatMatchDate, formatTL, formatTime } from "@/lib/format";
import type { ActivityItem } from "@/lib/data";

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "lock") {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red/10 text-red">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
      </div>
    );
  }
  if (kind === "win") {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green/10 text-green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M7 7l10 10M17 7v10H7" />
        </svg>
      </div>
    );
  }
  if (kind === "loss") {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red/10 text-red">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>
    );
  }
  if (kind === "cancel") {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-ink-dim">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.6L12 3z" />
      </svg>
    </div>
  );
}

export default function ActivityFeed({
  items,
  viewAllHref,
}: {
  items: ActivityItem[];
  // Only the preview on /cuzdan links out to the full history page — the
  // full history page itself renders this same component with no link back.
  viewAllHref?: string;
}) {
  return (
    <section>
      <div className="mb-1 flex items-end justify-between">
        <h2 className="font-display text-xl">Son Hareketler</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs font-bold text-gold">
            Tümünü gör
          </Link>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-dim">Her işlem bir maç veya sistem olayına bağlıdır.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-ink-dim">
          Henüz bir hareket yok.
        </div>
      ) : (
        <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card">
          {items.map((item) => {
            const date = new Date(item.at);
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                <ActivityIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-snug">{item.title}</div>
                  <div className="text-[11px] text-ink-faint">
                    {isToday ? `Bugün ${formatTime(date)}` : formatMatchDate(date)} · {item.subtitle}
                  </div>
                </div>
                <div className={`flex-shrink-0 font-display text-sm ${item.amount >= 0 ? "text-green" : "text-red"}`}>
                  {item.amount >= 0 ? "+" : "−"}
                  {formatTL(Math.abs(item.amount))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
