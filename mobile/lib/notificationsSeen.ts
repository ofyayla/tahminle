import * as SecureStore from "expo-secure-store";

// Read/unread lives on the device, not the server: the notification feed is
// derived from settlement/gift/transfer rows (lib/notifications.ts on the
// backend), and adding a server-side read flag would mean a whole table
// existing only to store one timestamp per user. The cost is that "read" does
// not follow you to a second device, which is fine for a badge.
const KEY = "tahminle_notifications_seen_at";

export async function getNotificationsSeenAt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function markNotificationsSeen(at: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, at);
  } catch {
    // A failed write just means the badge shows again next launch.
  }
}

export function countUnread(items: { at: string }[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  const cutoff = new Date(seenAt).getTime();
  if (Number.isNaN(cutoff)) return items.length;
  return items.filter((i) => new Date(i.at).getTime() > cutoff).length;
}
