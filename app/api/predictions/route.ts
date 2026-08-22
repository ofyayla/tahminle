import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOddsFor, isValidChoice, type MarketCode } from "@/lib/markets";
import { getPerformanceStats, getPredictions, syncMatchState } from "@/lib/data";
import type { PredictionDTO } from "@/lib/predictionTypes";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  await syncMatchState();

  const [openRaw, settledRaw, stats] = await Promise.all([
    getPredictions(userId, "open"),
    getPredictions(userId, "settled"),
    getPerformanceStats(userId),
  ]);

  const toDTO = (p: (typeof openRaw)[number]): PredictionDTO => ({
    id: p.id,
    market: p.market as PredictionDTO["market"],
    choice: p.choice,
    stake: p.stake,
    oddsAtPick: p.oddsAtPick,
    status: p.status as PredictionDTO["status"],
    payout: p.payout,
    createdAt: p.createdAt.toISOString(),
    settledAt: p.settledAt ? p.settledAt.toISOString() : null,
    match: {
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      kickoff: p.match.kickoff.toISOString(),
      status: p.match.status,
      result: p.match.result,
      resultOver25: p.match.resultOver25,
      resultBtts: p.match.resultBtts,
      homeScore: p.match.homeScore,
      awayScore: p.match.awayScore,
    },
  });

  return NextResponse.json({
    open: openRaw.map(toDTO),
    settled: settledRaw.map(toDTO),
    stats,
  });
}

const schema = z.object({
  matchId: z.string(),
  market: z.enum(["1X2", "OU25", "BTTS", "DC", "EXTRA"]).default("1X2"),
  choice: z.string().min(1).max(200),
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
  if (match.status !== "upcoming") {
    return NextResponse.json(
      { error: "Bu maç başladı, artık tahmin yapılamaz." },
      { status: 400 }
    );
  }

  const oddsAtPick = getOddsFor(
    { ...match, extraMarkets: match.extraMarkets as Record<string, number> | null },
    market as MarketCode,
    choice
  );
  if (oddsAtPick == null) {
    return NextResponse.json({ error: "Bu seçim için oran bulunamadı." }, { status: 400 });
  }

  // One open prediction per market per match — e.g. you can hold a 1X2 pick
  // and a Maç Skoru pick on the same match at once, but not two 1X2 picks.
  const existingOpen = await prisma.prediction.findFirst({
    where: { userId, matchId, market, status: "open" },
  });
  if (existingOpen) {
    return NextResponse.json(
      { error: "Bu market için zaten açık bir tahminin var." },
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
