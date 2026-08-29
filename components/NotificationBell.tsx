"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Read/unread is per-browser, the same way the mobile app keeps it per-device:
// the notification feed is derived from settlement/gift/transfer rows
// (lib/notifications.ts), so a server-side read flag would mean a table
// existing only to hold one timestamp per user. Kept in a client component
// because a Server Component can't read localStorage — or write the cookie
// that would be the alternative.
const SEEN_KEY = "tahminle_notifications_seen_at";

export function markNotificationsSeen(at: string) {
  try {
    localStorage.setItem(SEEN_KEY, at);
  } catch {
    // Private mode / blocked storage — the badge simply reappears next visit.
  }
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: { at: string }[] };
        if (cancelled || !items) return;

        let seenAt: string | null = null;
        try {
          seenAt = localStorage.getItem(SEEN_KEY);
        } catch {
          seenAt = null;
        }

        const cutoff = seenAt ? new Date(seenAt).getTime() : NaN;
        setUnread(
          Number.isNaN(cutoff)
            ? items.length
            : items.filter((i) => new Date(i.at).getTime() > cutoff).length
        );
      } catch {
        // The badge is a nicety — never surface a failure for it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/bildirimler"
      aria-label={unread > 0 ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-black/35 transition-colors hover:border-gold/40"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`h-5 w-5 ${unread > 0 ? "text-gold" : "text-ink-dim"}`}
      >
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-red px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
