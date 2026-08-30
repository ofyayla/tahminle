import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getWalletSummary, syncMatchState } from "@/lib/data";
import { getTransferHistory, getTransferTargets } from "@/lib/transfers";
import TransferForm from "@/components/TransferForm";

// syncMatchState() can fall back to a headless-browser live-score scrape
// (lib/liveScoreScraper.ts), which needs more than the default timeout.
export const maxDuration = 30;

export default async function GonderPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // This page can be reached directly (a bookmark, a notification) without
  // passing through /cuzdan first, so the available balance needs its own
  // sync rather than relying on the wallet page having just run one.
  await syncMatchState();
  const [wallet, targets, history] = await Promise.all([
    getWalletSummary(user.id),
    getTransferTargets(user.id),
    getTransferHistory(user.id),
  ]);

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
          <h1 className="font-display text-3xl">Bakiye Gönder</h1>
        </div>
      </section>
      <p className="-mt-3 text-sm text-ink-dim">
        Başka bir taraftara sanal bakiye aktar. Gönderilen bakiye geri alınamaz.
      </p>

      <TransferForm
        targets={targets}
        history={history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))}
        available={wallet.available}
      />
    </div>
  );
}
