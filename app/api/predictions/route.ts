import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOddsFor, isValidChoice, type MarketCode } from "@/lib/markets";

const schema = z.object({
  matchId: z.string(),
  market: z.enum(["1X2", "OU25", "BTTS", "DC"]).default("1X2"),
  choice: z.string(),
  stake: z.number().int().min(10).max(100000),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz tahmin bilgisi." }, { status: 400 });
  }

  const { matchId, market, choice, stake } = parsed.data;

  if (!isValidChoice(market as MarketCode, choice)) {
    return NextResponse.json({ error: "Geçersiz seçim." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Maç bulunamadı." }, { status: 404 });
  }
  if (match.status === "finished") {
    return NextResponse.json({ error: "Bu maç için tahmin süresi doldu." }, { status: 400 });
  }

  const oddsAtPick = getOddsFor(match, market as MarketCode, choice);
  if (oddsAtPick == null) {
    return NextResponse.json({ error: "Bu seçim için oran bulunamadı." }, { status: 400 });
  }

  const existingOpen = await prisma.prediction.findFirst({
    where: { userId, matchId, status: "open" },
  });
  if (existingOpen) {
    return NextResponse.json(
      { error: "Bu maç için zaten açık bir tahminin var." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.balance < stake) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: stake } },
    });

    return tx.prediction.create({
      data: { userId, matchId, market, choice, stake, oddsAtPick },
    });
  }).catch((err) => {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return null;
    }
    throw err;
  });

  if (!result) {
    return NextResponse.json(
      { error: "Sanal bakiyen bu tahmin için yeterli değil." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, prediction: result });
}
