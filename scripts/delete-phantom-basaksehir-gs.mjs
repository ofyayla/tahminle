// Tek seferlik temizlik: Başakşehir–Galatasaray fixture'ı Pazar 6 Eylül'den
// Cuma 4 Eylül'e alınınca, buildMatchKey anahtara takvim gününü gömdüğü için
// yeni tarih yeni bir externalId üretti ve eski satır güncellenmek yerine
// öksüz kaldı (28 Ağustos'tan beri oran güncellemesi almıyor, 0 tahmin).
//
// isSameFixture'a eklenen "aynı turnuva + 5 gün" erteleme penceresi bundan
// sonraki taşımaları otomatik birleştirecek; ama bu satır zaten mevcut doğru
// satırla (2026-09-04) çakışmadan durduğu için scrape onu kendiliğinden
// temizlemiyor. Bu yüzden elle siliyoruz.
//
// Kullanım:
//   node scripts/delete-phantom-basaksehir-gs.mjs           # sadece gösterir
//   node scripts/delete-phantom-basaksehir-gs.mjs --apply   # siler
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXTERNAL_ID = "match:basaksehir_galatasaray_2026-09-06";
const apply = process.argv.includes("--apply");

const row = await prisma.match.findUnique({
  where: { externalId: EXTERNAL_ID },
  include: { _count: { select: { predictions: true } } },
});

if (!row) {
  console.log("Öksüz satır bulunamadı — muhtemelen zaten silinmiş.");
} else {
  console.log(
    `Hedef: ${row.externalId} | ${row.homeTeam} vs ${row.awayTeam} | ` +
      `${row.kickoff.toISOString()} | status=${row.status} | tahmin=${row._count.predictions}`
  );
  if (row._count.predictions > 0) {
    console.log("İPTAL: bu satırda tahmin var, silinmez.");
  } else if (!apply) {
    console.log("Kuru çalışma. Silmek için --apply ekleyin.");
  } else {
    await prisma.match.delete({ where: { id: row.id } });
    console.log("Silindi.");
  }
}

await prisma.$disconnect();
