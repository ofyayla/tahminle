import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOddsFor, isValidChoice, type MarketCode } from "@/lib/markets";
import { getPerformanceStats, getPredictions, syncMatchState } from "@/lib/data";
import { PER_MATCH_CAP, weekEndFor, weekStartFor } from "@/lib/season";
import { weeklyBudgetCapFor } from "@/lib/perks";
import { BankoLockedError, setWeeklyBanko } from "@/lib/banko";
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
    isBanko: p.isBanko,
    wasInsured: p.wasInsured,
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
  // Mark this pick as the week's Banko right at creation — lib/banko.ts
  // enforces the "at most one per week" rule either way.
  isBanko: z.boolean().optional().default(false),
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

  const { matchId, market, choice, stake, isBanko } = parsed.data;

  if (!isValidChoice(market as MarketCode, choice)) {
    return NextResponse.json({ error: "Geçersiz seçim." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Maç bulunamadı." }, { status: 404 });
  }
  if (match.status !== "upcoming") {
    return NextResponse.json(
      {
        error:
          match.status === "postponed"
            ? "Bu maç ertelendi, tahmin oluşturulamaz."
            : "Bu maç başladı, artık tahmin yapılamaz.",
      },
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

  // Haftalık kasa (₺1.000/hafta) ve tek maç tavanı (₺400/maç) — kendi
  // tahminlerinle sınırlı, hediye edilen kuponlar dahil değil. Bir maç
  // yalnızca tek bir haftaya ait olduğundan tavan haftadan bağımsız
  // sorgulanır.
  const weekStart = weekStartFor(match.kickoff);
  const weekEnd = weekEndFor(match.kickoff);
  const [weeklyUsedRows, matchUsedRows] = await Promise.all([
    prisma.prediction.findMany({
      where: {
        userId,
        gift: { is: null },
        status: { in: ["open", "won", "lost"] },
        match: { kickoff: { gte: weekStart, lt: weekEnd } },
      },
      select: { stake: true },
    }),
    prisma.prediction.findMany({
      where: { userId, matchId, gift: { is: null }, status: { in: ["open", "won", "lost"] } },
      select: { stake: true },
    }),
  ]);
  const weeklyUsed = weeklyUsedRows.reduce((sum, r) => sum + r.stake, 0);
  const matchUsed = matchUsedRows.reduce((sum, r) => sum + r.stake, 0);
  const weeklyCap = await weeklyBudgetCapFor(userId, weekStart);

  if (weeklyUsed + stake > weeklyCap) {
    return NextResponse.json(
      {
        error: `Bu hafta için kasan ₺${weeklyCap - weeklyUsed} kaldı. Kasa her Pazartesi yenilenir.`,
      },
      { status: 400 }
    );
  }
  if (matchUsed + stake > PER_MATCH_CAP) {
    return NextResponse.json(
      {
        error: `Bu maça en fazla ₺${PER_MATCH_CAP} yatırabilirsin, ₺${PER_MATCH_CAP - matchUsed} kaldı.`,
      },
      { status: 400 }
    );
  }

  let bankoError: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.balance < stake) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: stake } },
    });

    const prediction = await tx.prediction.create({
      data: { userId, matchId, market, choice, stake, oddsAtPick },
    });

    if (isBanko) {
      try {
        await setWeeklyBanko(tx, userId, prediction.id);
      } catch (err) {
        if (err instanceof BankoLockedError) {
          // The pick itself is still valid — only the Banko flag failed —
          // so let the transaction commit and surface this as a warning
          // rather than losing the stake the user just committed.
          bankoError = err.message;
          return prediction;
        }
        throw err;
      }
    }

    return prediction;
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

  return NextResponse.json({ ok: true, prediction: result, bankoError });
}
