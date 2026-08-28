import { prisma } from "./prisma";

export const MIN_TRANSFER = 10;
export const MAX_TRANSFER = 100000;

export type TransferResult =
  | { ok: true; transferId: string }
  | { ok: false; error: string };

// Moves virtual balance from one player to another.
//
// The debit is expressed as a conditional `updateMany` (id + balance >= amount)
// rather than a read-then-write, so the balance check and the deduction are a
// single atomic statement: two concurrent transfers can never both pass the
// check and overdraw the sender. `.count === 0` means someone else got there
// first — we bail instead of crediting the recipient. This is the same guard
// pattern settlement uses after the double-payout incident.
export async function transferBalance(
  senderId: string,
  recipientId: string,
  amount: number,
  note?: string | null
): Promise<TransferResult> {
  if (senderId === recipientId) {
    return { ok: false, error: "Kendine transfer yapamazsın." };
  }
  if (!Number.isInteger(amount) || amount < MIN_TRANSFER || amount > MAX_TRANSFER) {
    return { ok: false, error: `Transfer tutarı ₺${MIN_TRANSFER} ile ₺${MAX_TRANSFER} arasında olmalı.` };
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!recipient) {
    return { ok: false, error: "Alıcı bulunamadı." };
  }

  try {
    const transferId = await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: senderId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count === 0) throw new Error("INSUFFICIENT_BALANCE");

      await tx.user.update({
        where: { id: recipientId },
        data: { balance: { increment: amount } },
      });

      const transfer = await tx.transfer.create({
        data: { senderId, recipientId, amount, note: note?.trim() || null },
      });
      return transfer.id;
    }, {
      // DATABASE_URL runs through pgbouncer, which caps Prisma to a very small
      // connection pool — concurrent interactive transactions queue up behind
      // each other. The default 2s wait is tight enough that a second
      // simultaneous transfer can fail outright, so give it real room.
      maxWait: 10000,
      timeout: 15000,
    });

    return { ok: true, transferId };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { ok: false, error: "Sanal bakiyen bu transfer için yeterli değil." };
    }
    throw err;
  }
}

// Everyone else, for the "kime göndereyim" picker. displayName is not unique
// in the schema, so the id is what the client sends back — never the name.
export async function getTransferTargets(currentUserId: string) {
  const users = await prisma.user.findMany({
    where: { id: { not: currentUserId } },
    select: { id: true, displayName: true, favoriteTeam: true },
    orderBy: { displayName: "asc" },
  });
  return users;
}

export type TransferHistoryItem = {
  id: string;
  direction: "in" | "out";
  amount: number;
  note: string | null;
  counterparty: string;
  createdAt: Date;
};

export async function getTransferHistory(userId: string, limit = 20): Promise<TransferHistoryItem[]> {
  const rows = await prisma.transfer.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    include: {
      sender: { select: { displayName: true } },
      recipient: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((t) => {
    const outgoing = t.senderId === userId;
    return {
      id: t.id,
      direction: outgoing ? "out" : "in",
      amount: t.amount,
      note: t.note,
      counterparty: outgoing ? t.recipient.displayName : t.sender.displayName,
      createdAt: t.createdAt,
    };
  });
}
