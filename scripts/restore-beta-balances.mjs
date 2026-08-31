// Tek seferlik düzeltme: 2026-08-31'de Sezon 1 çapası (SEASON_ONE_START) her
// kullanıcının bakiyesini ₺1000'e sıfırladı ve beta döneminde (19–30 Ağu)
// birikmiş bakiyeleri sildi. Bu script her kullanıcının sezon-öncesi
// bakiyesini tahmin/transfer/hediye/prim geçmişinden yeniden hesaplayıp geri
// yazar.
//
// ÇAPALARA DOKUNULMAZ. seasonAnchor/weekAnchor bozuk sıfırlamanın bıraktığı
// 2026-08-30T21:00:00Z (Pazartesi 00:00) değerinde kalır — bu değer hem eski
// (Pazartesi haftası) hem yeni (Salı haftası) applyPeriodicAdjustments için
// "bu dönem işlendi" demek, dolayısıyla henüz deploy edilmemiş / yeniden
// başlatılmamış eski kod çalışsa bile bakiyeleri bir daha sıfırlamaz. Çapalar
// bir sonraki Salı (2026-09-01) rollover'ında kendiliğinden doğru değere döner.
//
// Kullanım:
//   node scripts/restore-beta-balances.mjs            # dry-run, sadece tabloyu basar
//   node scripts/restore-beta-balances.mjs --apply    # DB'ye yazar
//
// Guard: yalnızca seasonAnchor'ı bozuk sıfırlama değerinde olan kullanıcılar
// güncellenir. Idempotent — tekrar çalıştırmak aynı hesaplanan değeri yazar.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const REFERRAL_BONUS = 100; // lib/referrals.ts
const STARTING_BALANCE = 1000; // lib/season.ts

// lib/season.ts ile aynı: Salı 00:00 İstanbul (UTC+3, DST yok).
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
function weekStartFor(date) {
  const local = new Date(date.getTime() + ISTANBUL_OFFSET_MS);
  const daysSinceTuesday = (local.getUTCDay() + 5) % 7;
  const localMidnight =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    daysSinceTuesday * 24 * 60 * 60 * 1000;
  return new Date(localMidnight - ISTANBUL_OFFSET_MS);
}
const SEASON_ONE_START = weekStartFor(new Date(Date.UTC(2026, 7, 31, 12, 0, 0)));

// applyPeriodicAdjustments'in 2026-08-31'de yazdığı çapa (Pazartesi 00:00
// İstanbul). Sadece bu değere sahip kullanıcılara dokunuruz.
const BAD_RESET_ANCHOR = new Date("2026-08-30T21:00:00.000Z");

// Beta'nın son haftası (24 Ağu, eski Pazartesi şeması). Bu birincilik +
// rozet + ₺250 prim korunur; ondan eski beta haftaları (spurious, biri Salı
// çapasına geçiş yan etkisiyle oluştu) silinir.
const KEEP_CHAMP_WEEKSTART = new Date("2026-08-23T21:00:00.000Z");

async function main() {
  // Sezon 1'den önce kapanan (beta) haftalar için oluşmuş WeeklyChampion
  // satırları — 24 Ağu haftası hariç — spurious. Sil ve primlerini yeniden
  // hesaba katma.
  const staleWhere = {
    weekStart: { lt: SEASON_ONE_START },
    NOT: { weekStart: KEEP_CHAMP_WEEKSTART },
  };
  const staleChamps = await prisma.weeklyChampion.findMany({
    where: staleWhere,
    include: { user: { select: { displayName: true } } },
  });

  const [users, preds, gifts, transfers, memberships, champs] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, displayName: true, balance: true, startBalance: true, seasonAnchor: true },
    }),
    prisma.prediction.findMany({
      select: { userId: true, stake: true, payout: true, status: true, gift: { select: { id: true } } },
    }),
    prisma.gift.findMany({ select: { senderId: true, price: true } }),
    prisma.transfer.findMany({ select: { senderId: true, recipientId: true, amount: true } }),
    prisma.leagueMembership.findMany({ where: { rewardGranted: true }, select: { userId: true, invitedById: true } }),
    prisma.weeklyChampion.findMany({
      where: { OR: [{ weekStart: { gte: SEASON_ONE_START } }, { weekStart: KEEP_CHAMP_WEEKSTART }] },
      select: { userId: true, bonus: true },
    }),
  ]);

  const acc = new Map(
    users.map((u) => [
      u.id,
      { name: u.displayName, current: u.balance, anchor: u.seasonAnchor, calc: STARTING_BALANCE },
    ])
  );

  for (const p of preds) {
    const r = acc.get(p.userId);
    if (!r) continue;
    // Kendi açtığı (gift olmayan) tahminlerde stake yerleştirmede düşülmüştü.
    if (!p.gift && (p.status === "open" || p.status === "won" || p.status === "lost")) r.calc -= p.stake;
    // Kazanç sahibinin bakiyesine eklenir (gift dahil).
    if (p.status === "won" || p.status === "lost") r.calc += p.payout ?? 0;
  }
  for (const g of gifts) {
    const r = acc.get(g.senderId);
    if (r) r.calc -= g.price;
  }
  for (const t of transfers) {
    const s = acc.get(t.senderId);
    if (s) s.calc -= t.amount;
    const rc = acc.get(t.recipientId);
    if (rc) rc.calc += t.amount;
  }
  for (const m of memberships) {
    const a = acc.get(m.userId);
    if (a) a.calc += REFERRAL_BONUS;
    if (m.invitedById) {
      const b = acc.get(m.invitedById);
      if (b) b.calc += REFERRAL_BONUS;
    }
  }
  for (const c of champs) {
    const r = acc.get(c.userId);
    if (r) r.calc += c.bonus;
  }

  const rows = [...acc.entries()].map(([id, r]) => ({
    id,
    name: r.name,
    current: r.current,
    target: r.calc,
    eligible: r.anchor != null && r.anchor.getTime() === BAD_RESET_ANCHOR.getTime(),
  }));

  console.log(`SEASON_ONE_START = ${SEASON_ONE_START.toISOString()}`);
  console.log(`mode            = ${APPLY ? "APPLY (DB'ye yazılacak)" : "dry-run"}`);
  console.log("çapalar         = DEĞİŞTİRİLMEZ (2026-08-30T21:00:00Z'de bırakılır)\n");
  console.log(`Silinecek beta WeeklyChampion satırları (${staleChamps.length}):`);
  for (const s of staleChamps) {
    console.log(`  ${s.weekStart.toISOString()}  ${s.user.displayName}  net ${s.net}  bonus ${s.bonus}`);
  }
  console.log();
  console.log("name              current   target    delta   eligible");
  for (const row of rows) {
    console.log(
      row.name.padEnd(16),
      String(row.current).padStart(7),
      String(row.target).padStart(9),
      String(row.target - row.current).padStart(8),
      "  " + (row.eligible ? "yes" : "NO — atlanır")
    );
  }

  if (!APPLY) {
    console.log("\nDry-run — hiçbir şey yazılmadı. Yazmak için: --apply");
    return;
  }

  const del = await prisma.weeklyChampion.deleteMany({ where: staleWhere });
  console.log(`\n${del.count} beta WeeklyChampion satırı silindi.`);

  let updated = 0;
  for (const row of rows) {
    if (!row.eligible) continue;
    await prisma.user.update({ where: { id: row.id }, data: { balance: row.target } });
    updated++;
  }
  console.log(`${updated} kullanıcı bakiyesi güncellendi (çapalara dokunulmadı).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
