import { prisma } from "./prisma";

// Expo's push service. No API key is required for the basic (unauthenticated)
// flow — the Expo push token itself is the capability.
const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

// Expo accepts at most 100 messages per request.
const CHUNK_SIZE = 100;

export type PushPayload = {
  title: string;
  body: string;
  // Delivered to the app so a tap can route somewhere useful. Keep it small —
  // Expo caps the whole message at 4KB.
  data?: Record<string, string>;
};

type ExpoMessage = PushPayload & {
  to: string;
  sound: "default";
  channelId: "default";
  priority: "high";
};

type ExpoTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Fire-and-forget by design: a push is a nice-to-have side effect of settling
// a match or receiving a gift, never a reason for that operation to fail. All
// errors are logged and swallowed.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return 0;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: unique } },
    select: { token: true },
  });
  if (tokens.length === 0) return 0;

  const messages: ExpoMessage[] = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    channelId: "default",
    priority: "high",
    ...payload,
  }));

  let delivered = 0;

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error("Expo push isteği başarısız:", res.status, await res.text().catch(() => ""));
        continue;
      }

      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];

      // A token that the device no longer holds (app uninstalled, reinstalled,
      // notifications revoked) comes back as DeviceNotRegistered. Expo asks
      // that we stop sending to it, so drop the row rather than retrying it
      // on every future notification.
      const dead: string[] = [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") {
          delivered++;
          return;
        }
        if (ticket.details?.error === "DeviceNotRegistered") {
          dead.push(batch[i].to);
        } else {
          console.error("Expo push bildirimi reddedildi:", ticket.message);
        }
      });

      if (dead.length > 0) {
        await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      }
    } catch (err) {
      console.error("Expo push gönderilemedi:", err);
    }
  }

  return delivered;
}

// Everyone holding an open prediction on a match — the audience for goal and
// kickoff notifications.
export async function usersWithOpenPredictionsOn(matchId: string): Promise<string[]> {
  const rows = await prisma.prediction.findMany({
    where: { matchId, status: "open" },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}
