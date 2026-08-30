import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getWalletSummary, syncMatchState } from "@/lib/data";
import { getTransferTargets } from "@/lib/transfers";
import { getGiftsFor } from "@/lib/gifts";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import GiftForm from "@/components/GiftForm";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export default async function HediyePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // This page can be reached directly (a bookmark, a notification) without
  // passing through /cuzdan first, so the available balance and gift picks
  // need their own sync rather than relying on the wallet page having just
  // run one.
  await syncMatchState();
  const [wallet, targets, gifts] = await Promise.all([
    getWalletSummary(user.id),
    getTransferTargets(user.id),
    getGiftsFor(user.id),
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

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <section className="flex items-center gap-3">
        <Link
          href="/cuzdan"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink-dim"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cüzdan</p>
          <h1 className="font-display text-3xl">Sürpriz Kupon</h1>
        </div>
      </section>
      <p className="-mt-3 text-sm text-ink-dim">
        Bir taraftara rastgele bir kupon hediye et. Kazanırsa tamamı ona gider.
      </p>

      <GiftForm targets={targets} received={receivedGifts} sent={sentGifts} available={wallet.available} />
    </div>
  );
}
