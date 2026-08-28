import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import {
  MAX_GIFT_PRICE,
  MIN_GIFT_PRICE,
  getGiftsFor,
  giftFeeFor,
  openGift,
  sendGift,
} from "@/lib/gifts";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const { received, sent } = await getGiftsFor(userId);

  // An unopened gift must not leak its selection to the recipient — that's the
  // whole point of the surprise — so the pick is stripped server-side rather
  // than merely hidden in the UI.
  const receivedDTO = received.map((g) => ({
    id: g.id,
    from: g.sender.displayName,
    price: g.price,
    stake: g.stake,
    opened: g.openedAt != null,
    createdAt: g.createdAt.toISOString(),
    pick: g.openedAt
      ? {
          match: `${g.prediction.match.homeTeam} – ${g.prediction.match.awayTeam}`,
          kickoff: g.prediction.match.kickoff.toISOString(),
          market: getMarketName(g.prediction.market as MarketCode),
          label: getChoiceLabel(g.prediction.match, g.prediction.market as MarketCode, g.prediction.choice),
          odds: g.prediction.oddsAtPick,
          status: g.prediction.status,
          payout: g.prediction.payout,
        }
      : null,
  }));

  const sentDTO = sent.map((g) => ({
    id: g.id,
    to: g.recipient.displayName,
    price: g.price,
    fee: g.fee,
    opened: g.openedAt != null,
    createdAt: g.createdAt.toISOString(),
    match: `${g.prediction.match.homeTeam} – ${g.prediction.match.awayTeam}`,
    label: getChoiceLabel(g.prediction.match, g.prediction.market as MarketCode, g.prediction.choice),
    odds: g.prediction.oddsAtPick,
    status: g.prediction.status,
  }));

  return NextResponse.json({
    received: receivedDTO,
    sent: sentDTO,
    limits: { min: MIN_GIFT_PRICE, max: MAX_GIFT_PRICE },
  });
}

const sendSchema = z.object({
  recipientId: z.string().min(1),
  price: z.number().int().min(MIN_GIFT_PRICE).max(MAX_GIFT_PRICE),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // Two actions share this route: sending a new gift, and opening one.
  if (body && typeof body === "object" && "openGiftId" in body) {
    const id = String((body as { openGiftId: unknown }).openGiftId ?? "");
    if (!id) return NextResponse.json({ error: "Geçersiz hediye." }, { status: 400 });
    const opened = await openGift(userId, id);
    if (!opened) {
      return NextResponse.json({ error: "Bu hediye zaten açılmış ya da sana ait değil." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz hediye bilgisi." }, { status: 400 });
  }

  const { recipientId, price } = parsed.data;
  const result = await sendGift(userId, recipientId, price);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, giftId: result.giftId, fee: giftFeeFor(price) });
}
