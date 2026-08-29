import { prisma } from "./prisma";
import type { MarketCode } from "./markets";
import { formatTL } from "./format";
import { sendPushToUsers } from "./push";

export const MIN_GIFT_PRICE = 50;
export const MAX_GIFT_PRICE = 5000;

// The house's cut for wrapping the surprise. Also the reason a gift is a
// slightly lossy way to move balance around, which keeps it from being a
// clean laundering route for the leaderboard.
export const GIFT_FEE_RATE = 0.1;

// The random draw is deliberately confined to selections settlement can
// actually resolve — 1X2 / 2.5 A/Ü / KG / Çifte Şans. The bulletin carries
// ~200 markets per match (korner, kart, gol atacak oyuncu, İY skoru, ...) but
// `isWinningChoice` has no branch for any of them, so a gift drawn from the
// full list would silently lose every time. "İlk Yarı Skoru (1:0)" is worse
// than useless: it matches the Maç Skoru regex and would be judged against
// the FULL-TIME score. Maç Skoru itself is excluded too — its odds sit far
// above the band below.
const GIFTABLE_MARKETS = ["1X2", "OU25", "BTTS", "DC"] as const;

// Odds band for the draw. The floor drops dead/suspended markets, which the
// provider publishes as exactly 1.00 (a "win" would return the stake and
// nothing else). The ceiling keeps a gift feeling like a gift rather than a
// lottery ticket that almost certainly expires worthless.
const MIN_ODDS = 1.2;
const MAX_ODDS = 3.5;

export function giftFeeFor(price: number): number {
  return Math.max(5, Math.round(price * GIFT_FEE_RATE));
}

type Candidate = {
  matchId: string;
  market: MarketCode;
  choice: string;
  odds: number;
};

type GiftableMatch = {
  id: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
  dc1X: number | null;
  dc12: number | null;
  dcX2: number | null;
};

function candidatesFor(match: GiftableMatch): Candidate[] {
  const raw: { market: MarketCode; choice: string; odds: number | null }[] = [
    { market: "1X2", choice: "1", odds: match.oddsHome },
    { market: "1X2", choice: "X", odds: match.oddsDraw },
    { market: "1X2", choice: "2", odds: match.oddsAway },
    { market: "OU25", choice: "OVER", odds: match.over25 },
    { market: "OU25", choice: "UNDER", odds: match.under25 },
    { market: "BTTS", choice: "YES", odds: match.bttsYes },
    { market: "BTTS", choice: "NO", odds: match.bttsNo },
    { market: "DC", choice: "1X", odds: match.dc1X },
    { market: "DC", choice: "12", odds: match.dc12 },
    { market: "DC", choice: "X2", odds: match.dcX2 },
  ];

  return raw
    .filter((c): c is { market: MarketCode; choice: string; odds: number } => c.odds != null)
    .filter((c) => c.odds >= MIN_ODDS && c.odds <= MAX_ODDS)
    .map((c) => ({ matchId: match.id, market: c.market, choice: c.choice, odds: c.odds }));
}

export type GiftResult =
  | { ok: true; giftId: string }
  | { ok: false; error: string };

export async function sendGift(
  senderId: string,
  recipientId: string,
  price: number
): Promise<GiftResult> {
  if (senderId === recipientId) {
    return { ok: false, error: "Kendine hediye gönderemezsin." };
  }
  if (!Number.isInteger(price) || price < MIN_GIFT_PRICE || price > MAX_GIFT_PRICE) {
    return { ok: false, error: `Hediye tutarı ₺${MIN_GIFT_PRICE} ile ₺${MAX_GIFT_PRICE} arasında olmalı.` };
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) {
    return { ok: false, error: "Alıcı bulunamadı." };
  }

  // Only the ten giftable odds columns — selecting the whole row would drag
  // along each match's `extraMarkets` blob (200+ markets of JSON per match),
  // which is hundreds of KB over the wire for data the draw never looks at.
  const matches = await prisma.match.findMany({
    where: { status: "upcoming", kickoff: { gt: new Date() } },
    select: {
      id: true,
      oddsHome: true,
      oddsDraw: true,
      oddsAway: true,
      over25: true,
      under25: true,
      bttsYes: true,
      bttsNo: true,
      dc1X: true,
      dc12: true,
      dcX2: true,
    },
  });
  if (matches.length === 0) {
    return { ok: false, error: "Şu anda tahmin yapılabilecek maç yok." };
  }

  // Respect the one-open-prediction-per-market-per-match rule, otherwise the
  // gift would create a duplicate the recipient could never have made.
  const recipientOpen = await prisma.prediction.findMany({
    where: { userId: recipientId, status: "open" },
    select: { matchId: true, market: true },
  });
  const taken = new Set(recipientOpen.map((p) => `${p.matchId}:${p.market}`));

  const pool = matches
    .flatMap(candidatesFor)
    .filter((c) => !taken.has(`${c.matchId}:${c.market}`));

  if (pool.length === 0) {
    return { ok: false, error: "Bu oyuncu için uygun bir sürpriz kupon bulunamadı." };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const fee = giftFeeFor(price);
  const stake = price - fee;

  try {
    const giftId = await prisma.$transaction(async (tx) => {
      // Conditional debit: the balance check and the deduction are one
      // statement, so two gifts sent at once can't both overdraw the sender.
      const debit = await tx.user.updateMany({
        where: { id: senderId, balance: { gte: price } },
        data: { balance: { decrement: price } },
      });
      if (debit.count === 0) throw new Error("INSUFFICIENT_BALANCE");

      // The stake is already paid for by the sender, so the recipient's
      // balance is untouched here — they simply receive an open prediction.
      const prediction = await tx.prediction.create({
        data: {
          userId: recipientId,
          matchId: pick.matchId,
          market: pick.market,
          choice: pick.choice,
          stake,
          oddsAtPick: pick.odds,
        },
      });

      const gift = await tx.gift.create({
        data: { senderId, recipientId, price, fee, stake, predictionId: prediction.id },
      });
      return gift.id;
    }, {
      // See lib/transfers.ts — pgbouncer keeps the pool tiny, so concurrent
      // interactive transactions need more than the default 2s to queue.
      maxWait: 10000,
      timeout: 15000,
    });

    // After the transaction commits — a push must never be able to roll back
    // or delay the gift itself.
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { displayName: true },
    });
    await sendPushToUsers([recipientId], {
      title: "🎁 Sürpriz kupon geldi!",
      body: `${sender?.displayName ?? "Bir taraftar"} sana ${formatTL(stake)} değerinde bir kupon gönderdi. Aç ve gör!`,
      data: { type: "gift", giftId },
    });

    return { ok: true, giftId };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { ok: false, error: "Sanal bakiyen bu hediye için yeterli değil." };
    }
    throw err;
  }
}

// Marks a gift as opened so its selection can be revealed. Guarded so the
// reveal timestamp reflects the first open, not the most recent page load.
export async function openGift(userId: string, giftId: string) {
  const claimed = await prisma.gift.updateMany({
    where: { id: giftId, recipientId: userId, openedAt: null },
    data: { openedAt: new Date() },
  });
  return claimed.count > 0;
}

export async function getGiftsFor(userId: string) {
  const [received, sent] = await Promise.all([
    prisma.gift.findMany({
      where: { recipientId: userId },
      include: {
        sender: { select: { displayName: true } },
        prediction: { include: { match: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.gift.findMany({
      where: { senderId: userId },
      include: {
        recipient: { select: { displayName: true } },
        prediction: { include: { match: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { received, sent };
}
