import { getCurrentUser } from "@/lib/auth";
import { getRecentActivity, getWalletSummary, syncMatchState } from "@/lib/data";
import { getTransferHistory, getTransferTargets } from "@/lib/transfers";
import { getGiftsFor } from "@/lib/gifts";
import { getUserPerkStatus } from "@/lib/perks";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import { budgetSegments, formatTL } from "@/lib/format";
import ActivityFeed from "@/components/ActivityFeed";
import InfoAccordion from "@/components/InfoAccordion";
import TransferPanel from "@/components/TransferPanel";
import GiftPanel from "@/components/GiftPanel";
import PerksPanel from "@/components/PerksPanel";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export default async function CuzdanPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await syncMatchState();
  const [wallet, activity, transferTargets, transferHistory, gifts, perks] = await Promise.all([
    getWalletSummary(user.id),
    getRecentActivity(user.id, 5),
    getTransferTargets(user.id),
    getTransferHistory(user.id),
    getGiftsFor(user.id),
    getUserPerkStatus(user.id),
  ]);

  // Unopened gifts must not leak their selection into the page payload, so
  // the pick is only attached once the recipient has actually opened it.
  const receivedGifts = gifts.received.map((g) => ({
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

  const sentGifts = gifts.sent.map((g) => ({
    id: g.id,
    to: g.recipient.displayName,
    price: g.price,
    fee: g.fee,
    opened: g.openedAt != null,
    match: `${g.prediction.match.homeTeam} – ${g.prediction.match.awayTeam}`,
    label: getChoiceLabel(g.prediction.match, g.prediction.market as MarketCode, g.prediction.choice),
    odds: g.prediction.oddsAtPick,
    status: g.prediction.status,
  }));
  const budgetOverCap = wallet.weeklyBudget.used > wallet.weeklyBudget.cap;
  const { segments: budgetSegs, denom: budgetDenom } = budgetSegments(
    wallet.weeklyBudget.byMatch,
    wallet.weeklyBudget.cap,
    wallet.weeklyBudget.used
  );

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cüzdan Kontrolü</p>
        <h1 className="font-display text-3xl">Sanal Bakiye</h1>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-card-border bg-card p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(246,201,69,0.35), transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Toplam Sanal Bakiyen</div>
            <div className="font-display text-4xl text-gold mt-1">{formatTL(wallet.total)}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 divide-x divide-card-border border-t border-card-border pt-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Başlangıç Bakiyesi</div>
            <div className="font-display text-lg mt-1">{formatTL(user.startBalance)}</div>
          </div>
          <div className="pl-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">Bu Haftaki Değişim</div>
            <div className={`font-display text-lg mt-1 ${wallet.weekChange >= 0 ? "text-green" : "text-red"}`}>
              {wallet.weekChange >= 0 ? "+" : ""}
              {formatTL(wallet.weekChange)}
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-1.5 rounded-xl bg-bg-elevated px-3 py-2 text-xs text-ink-dim">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-green"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Gerçek para kullanılmaz · yalnızca sanal tahmin
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Bu Haftaki Kasan</div>
            <div className="font-display text-lg mt-0.5">
              {formatTL(wallet.weeklyBudget.used)} / {formatTL(wallet.weeklyBudget.cap)}
            </div>
          </div>
          <div className="text-right text-xs text-ink-dim">
            {budgetOverCap ? (
              <div className="font-display text-sm text-ink-dim">Kasan doldu</div>
            ) : (
              <>
                <div className="font-display text-sm text-gold">{formatTL(wallet.weeklyBudget.remaining)}</div>
                kaldı
              </>
            )}
          </div>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-elevated">
          {budgetSegs.map((s, i) => (
            <div
              key={s.label}
              style={{
                width: `${(s.stake / budgetDenom) * 100}%`,
                backgroundColor: s.color,
                borderRight: i < budgetSegs.length - 1 ? "1px solid var(--card)" : undefined,
              }}
            />
          ))}
        </div>

        {budgetSegs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-dim">
            {budgetSegs.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
                {s.label} {formatTL(s.stake)}
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 text-[11px] text-ink-dim">
          Kendi tahminlerine bu hafta yatırabileceğin toplam tutar — bakiyen ne kadar büyük olursa olsun aynı. Her Pazartesi yenilenir.
        </p>
        {budgetOverCap && (
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Kasa kuralından önce yaptığın tahminler de bu toplama dahil. Gelecek Pazartesi&apos;den itibaren gerçek anlamda işleyecek.
          </p>
        )}
      </section>

      <PerksPanel perks={perks} />

      <TransferPanel
        targets={transferTargets}
        history={transferHistory.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))}
        available={wallet.available}
      />

      <GiftPanel
        targets={transferTargets}
        received={receivedGifts}
        sent={sentGifts}
        available={wallet.available}
      />

      <ActivityFeed items={activity} viewAllHref="/cuzdan/hareketler" />

      <InfoAccordion title="Nasıl hesaplanır?" subtitle="Sanal getirinin kısa açıklaması" defaultOpen={false}>
        Tahmin onaylandığında kilitlenen oran kullanılır.{" "}
        <span className="font-bold text-ink">Sanal getiri = sanal tahmin tutarı × kilitlenen oran.</span>{" "}
        Maç sonucu işlendiğinde tutar bakiyene eklenir veya rezerve edilen sanal bakiye güncellenir.
      </InfoAccordion>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-ink-faint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 flex-shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Oranlar yalnızca simülasyon içindir. Gerçek para yatırma veya çekme yoktur.
      </p>
    </div>
  );
}
