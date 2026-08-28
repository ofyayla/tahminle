import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import {
  MAX_TRANSFER,
  MIN_TRANSFER,
  getTransferHistory,
  getTransferTargets,
  transferBalance,
} from "@/lib/transfers";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [targets, history] = await Promise.all([
    getTransferTargets(userId),
    getTransferHistory(userId),
  ]);

  return NextResponse.json({
    targets,
    history: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    limits: { min: MIN_TRANSFER, max: MAX_TRANSFER },
  });
}

const schema = z.object({
  recipientId: z.string().min(1),
  amount: z.number().int().min(MIN_TRANSFER).max(MAX_TRANSFER),
  note: z.string().max(140).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz transfer bilgisi." }, { status: 400 });
  }

  const { recipientId, amount, note } = parsed.data;
  const result = await transferBalance(userId, recipientId, amount, note);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, transferId: result.transferId });
}
