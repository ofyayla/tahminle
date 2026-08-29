import { prisma } from "./prisma";
import { formatTL } from "./format";

// The in-app notification centre is derived from rows that already exist —
// settled predictions, received gifts, received transfers — rather than a
// dedicated table. Nothing here needs to outlive the events it describes, and
// a separate table would only be a second copy to keep in sync with
// settlement. Read/unread is tracked per-device on the client.

export type NotificationItem = {
  id: string;
  kind: "settled" | "gift" | "transfer";
  status: "won" | "lost" | "mixed" | "info";
  title: string;
  body: string;
  // Signed wallet effect, or null when the event doesn't move the balance.
  amount: number | null;
  at: string;
};

const FEED_LIMIT = 40;

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const [settled, gifts, transfers] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId, status: { in: ["won", "lost"] }, settledAt: { not: null } },
      include: {
        match: { select: { id: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true } },
        gift: { select: { id: true } },
      },
      orderBy: { settledAt: "desc" },
      take: FEED_LIMIT * 2,
    }),
    prisma.gift.findMany({
      where: { recipientId: userId },
      include: { sender: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: FEED_LIMIT,
    }),
    prisma.transfer.findMany({
      where: { recipientId: userId },
      include: { sender: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: FEED_LIMIT,
    }),
  ]);

  const items: NotificationItem[] = [];

  // One card per match, not per prediction — someone holding four picks on a
  // match should see a single "sonuç işlendi", the same way the push does.
  const byMatch = new Map<
    string,
    {
      matchId: string;
      label: string;
      score: string | null;
      won: number;
      lost: number;
      payout: number;
      staked: number;
      at: Date;
    }
  >();

  for (const p of settled) {
    if (!p.settledAt) continue;
    const m = p.match;
    const bucket = byMatch.get(m.id) ?? {
      matchId: m.id,
      label: `${m.homeTeam} – ${m.awayTeam}`,
      score:
        m.homeScore != null && m.awayScore != null ? `${m.homeScore}-${m.awayScore}` : null,
      won: 0,
      lost: 0,
      payout: 0,
      staked: 0,
      at: p.settledAt,
    };

    if (p.status === "won") bucket.won++;
    else bucket.lost++;
    bucket.payout += p.payout ?? 0;
    // A gifted prediction was paid for by the sender, so losing it costs this
    // user nothing — mirrors getWalletSummary's accounting.
    bucket.staked += p.gift ? 0 : p.stake;
    if (p.settledAt > bucket.at) bucket.at = p.settledAt;

    byMatch.set(m.id, bucket);
  }

  for (const b of byMatch.values()) {
    const net = b.payout - b.staked;
    const title = b.score
      ? `${b.label.split(" – ")[0]} ${b.score} ${b.label.split(" – ")[1]}`
      : b.label;

    const body =
      b.won > 0 && b.lost > 0
        ? `${b.won} tahminin tuttu, ${b.lost} tanesi tutmadı. ${
            net >= 0 ? `${formatTL(net)} kâr.` : `${formatTL(Math.abs(net))} zarar.`
          }`
        : b.won > 0
        ? `Tahminin kazandı, ${formatTL(b.payout)} cüzdanına eklendi.`
        : `Tahminin tutmadı, ${formatTL(b.staked)} kaybettin.`;

    items.push({
      id: `settled-${b.matchId}`,
      kind: "settled",
      status: b.won > 0 && b.lost > 0 ? "mixed" : b.won > 0 ? "won" : "lost",
      title,
      body,
      amount: net,
      at: b.at.toISOString(),
    });
  }

  for (const g of gifts) {
    items.push({
      id: `gift-${g.id}`,
      kind: "gift",
      status: "info",
      title: "Sürpriz kupon geldi",
      body: g.openedAt
        ? `${g.sender.displayName} sana ${formatTL(g.stake)} değerinde bir kupon gönderdi.`
        : `${g.sender.displayName} sana bir kupon gönderdi — henüz açmadın!`,
      amount: null,
      at: g.createdAt.toISOString(),
    });
  }

  for (const t of transfers) {
    items.push({
      id: `transfer-${t.id}`,
      kind: "transfer",
      status: "info",
      title: "Bakiye geldi",
      body: `${t.sender.displayName} sana ${formatTL(t.amount)} gönderdi.${
        t.note ? ` "${t.note}"` : ""
      }`,
      amount: t.amount,
      at: t.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, FEED_LIMIT);
}
