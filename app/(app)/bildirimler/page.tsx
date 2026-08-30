import Link from "next/link";
import MarkNotificationsSeen from "@/components/MarkNotificationsSeen";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, type NotificationItem } from "@/lib/notifications";
import { formatMatchDate, formatTime } from "@/lib/format";

const ACCENT: Record<NotificationItem["status"], string> = {
  won: "text-green",
  lost: "text-red",
  mixed: "text-gold",
  info: "text-gold",
};

const BG: Record<NotificationItem["status"], string> = {
  won: "bg-green/15",
  lost: "bg-red/15",
  mixed: "bg-gold/15",
  info: "bg-gold/15",
};

function kickerFor(item: NotificationItem): string {
  if (item.kind === "gift") return "HEDİYE";
  if (item.kind === "transfer") return "TRANSFER";
  if (item.kind === "league_joined") return "ARKADAŞ LİGİ";
  return "SONUÇ İŞLENDİ";
}

function Icon({ item }: { item: NotificationItem }) {
  if (item.kind === "league_joined") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8" />
      </svg>
    );
  }
  if (item.kind === "gift") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13M3 12h18M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" />
      </svg>
    );
  }
  if (item.kind === "transfer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }
  if (item.status === "lost") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 6H5a2 2 0 000 4h2M17 6h2a2 2 0 010 4h-2" />
    </svg>
  );
}

export default async function BildirimlerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const items = await getNotifications(user.id);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <MarkNotificationsSeen newestAt={items[0]?.at ?? null} />

      <section className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink-dim transition-colors hover:text-ink"
          aria-label="Geri"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Bildirimler</p>
          <h1 className="font-display text-2xl">Neler oldu?</h1>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
          <p className="font-display text-base">Henüz bir bildirimin yok.</p>
          <p className="mt-2 text-sm text-ink-dim">
            Tahminlerin sonuçlandığında, sana hediye ya da bakiye geldiğinde burada görünecek.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pb-2">
          {items.map((item) => {
            const at = new Date(item.at);
            return (
              <div
                key={item.id}
                className="flex items-start gap-3.5 rounded-2xl border border-card-border bg-card p-4"
              >
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${BG[item.status]} ${ACCENT[item.status]}`}
                >
                  <Icon item={item} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${ACCENT[item.status]}`}>
                    {kickerFor(item)}
                  </div>
                  <div className="mt-1 font-display text-base">{item.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-dim">{item.body}</p>
                  <div className="mt-2 text-[11px] text-ink-faint">
                    {formatMatchDate(at)} · {formatTime(at)}
                  </div>
                </div>
                {item.status === "won" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 flex-shrink-0 text-green">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12l3 3 5-6" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
