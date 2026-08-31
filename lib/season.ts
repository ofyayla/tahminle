import { prisma } from "./prisma";

// Turkey has not observed daylight saving since 2016 — the offset is a flat
// UTC+3 all year, so week/season boundaries need no timezone database.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// A maç haftası (Faz 1, madde 01): Tuesday 00:00 → Monday 23:59 Istanbul time,
// independent of any season anchor — pure calendar math, valid for any date.
// Haftalık takip ve tüm hafta pencereleri (kasa, sıralama, banko, haftanın
// birincisi) Salı'dan Salı'ya işler; birinci ödülleri Salı 09:00'da hesaplanır.
export function weekStartFor(date: Date): Date {
  const local = new Date(date.getTime() + ISTANBUL_OFFSET_MS);
  const daysSinceTuesday = (local.getUTCDay() + 5) % 7;
  const localMidnight =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    daysSinceTuesday * 24 * 60 * 60 * 1000;
  return new Date(localMidnight - ISTANBUL_OFFSET_MS);
}

export function weekEndFor(date: Date): Date {
  return new Date(weekStartFor(date).getTime() + WEEK_MS);
}

// A season is 4 maç haftası (Faz 1, madde 03). Season 1 opens Tuesday 00:00
// Istanbul on 2026-08-25 — the noon-2026-08-31 seed resolves through the
// Salı-anchored weekStartFor to that boundary, so the anchor is guaranteed to
// land exactly on a week boundary. Next season boundary: Tuesday 2026-09-22.
export const SEASON_ONE_START = weekStartFor(new Date(Date.UTC(2026, 7, 31, 12, 0, 0)));
export const SEASON_WEEKS = 4;
const SEASON_MS = SEASON_WEEKS * WEEK_MS;

// The season containing `date`, extrapolating the 4-week grid both forward
// and backward from SEASON_ONE_START — always well-defined, never clamped.
// A date before the anchor lands in the pre-season bucket that ends exactly
// when Season 1 begins; applyPeriodicAdjustments() below is what actually
// gates the reset/top-up mechanics to not fire before that boundary.
export function seasonStartFor(date: Date): Date {
  const weeksFromAnchor = Math.floor(
    (weekStartFor(date).getTime() - SEASON_ONE_START.getTime()) / WEEK_MS
  );
  const seasonIndex = Math.floor(weeksFromAnchor / SEASON_WEEKS);
  return new Date(SEASON_ONE_START.getTime() + seasonIndex * SEASON_MS);
}

export function seasonEndFor(date: Date): Date {
  return new Date(seasonStartFor(date).getTime() + SEASON_MS);
}

// Which week of the current season `date` falls in, 1-indexed (1..4).
export function seasonWeekNumber(date: Date): number {
  const weeksFromSeasonStart = Math.round(
    (weekStartFor(date).getTime() - seasonStartFor(date).getTime()) / WEEK_MS
  );
  return weeksFromSeasonStart + 1;
}

// --- Ekonomi sabitleri (Faz 1, Bölüm II) ---

// Sezon başı / sıfırlama sonrası bakiye.
export const STARTING_BALANCE = 1000;

// Haftalık kasa: bir maç haftasında kendi tahminlerine yatırabileceğin toplam
// tutar. Herkes için aynıdır — bakiye ne olursa olsun kasa büyümez, bu yüzden
// zengin bir bakiye sıralamayı satın alamaz.
export const WEEKLY_BUDGET = 3000;

// Tek bir maça (tüm marketleri toplamda) yatırılabilecek en fazla tutar —
// haftanın tamamının tek kupona bağlanmasını engeller.
export const PER_MATCH_CAP = 1000;

// Salı desteği: haftaya bu tutarın altında giren oyuncunun bakiyesi bu
// tutara tamamlanır. Sezonu tek kötü haftada kaybetmeyi imkânsız kılar.
export const WEEKLY_TOPUP_FLOOR = 200;

// Her cron/sayfa isteğinde çağrılır (bkz. lib/data.ts syncMatchState). İki
// updateMany + bir "kontrol edildi" işaretlemesi — hepsi WHERE koşullu ve
// çoğu tick'te sıfır satırı etkiler, o yüzden bu sıklıkta çalıştırmak ucuz.
export async function applyPeriodicAdjustments(now: Date = new Date()) {
  // Sezon 1, SEASON_ONE_START'tan önce açılmaz. Bu koruma olmasa,
  // seasonStartFor bugünü içeren geçmişe dönük 4 haftalık kovaya düşürür ve
  // her kullanıcının boş (null) anchor'ı "gecikmiş" görünüp bakiyeler daha
  // sınır gelmeden sıfırlanırdı.
  if (now.getTime() < SEASON_ONE_START.getTime()) {
    return { seasonResets: 0, weeklyTopUps: 0 };
  }

  const weekStart = weekStartFor(now);
  const seasonStart = seasonStartFor(now);

  // Sezon sıfırlama önce çalışır: sezonu yeni başlayan biri, o an bakiyesi
  // ne olursa olsun ₺1.000/₺1.000'e döner ve iki anchor da güncellenir.
  const seasonReset = await prisma.user.updateMany({
    where: { OR: [{ seasonAnchor: null }, { seasonAnchor: { lt: seasonStart } }] },
    data: {
      balance: STARTING_BALANCE,
      startBalance: STARTING_BALANCE,
      seasonAnchor: seasonStart,
      weekAnchor: weekStart,
    },
  });

  // Salı desteği: bu hafta için henüz kontrol edilmemiş ve tabanın
  // altındaki bakiyeler tabana tamamlanır. Sezon sıfırlaması gören
  // kullanıcılar weekAnchor'ı zaten güncellendiği için burada tekrar
  // işlenmez.
  const topUp = await prisma.user.updateMany({
    where: {
      AND: [
        { OR: [{ weekAnchor: null }, { weekAnchor: { lt: weekStart } }] },
        { balance: { lt: WEEKLY_TOPUP_FLOOR } },
      ],
    },
    data: { balance: WEEKLY_TOPUP_FLOOR, weekAnchor: weekStart },
  });

  // Tabanın üstünde olup desteğe ihtiyacı olmayanları da "bu hafta
  // kontrol edildi" olarak işaretle — yoksa hafta boyunca her tick'te
  // gereksiz yere tekrar sorgulanırlar.
  await prisma.user.updateMany({
    where: { OR: [{ weekAnchor: null }, { weekAnchor: { lt: weekStart } }] },
    data: { weekAnchor: weekStart },
  });

  return { seasonResets: seasonReset.count, weeklyTopUps: topUp.count };
}
