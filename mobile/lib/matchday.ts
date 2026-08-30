import { api, type WeeklyBankoStatus } from "./api";
import type { MatchDTO } from "./types";

// The slice of Maç Günü the hero + match list need to paint. Everything else
// on the screen (leagues teaser, notification badge) is non-critical and stays
// on the screen's own best-effort loads.
export type MatchdaySnapshot = {
  matches: MatchDTO[];
  available: number;
  weeklyBanko: WeeklyBankoStatus;
  wallet: { openCount: number; lockedInOpen: number; potentialReturn: number; total: number };
};

// How long a snapshot is worth painting immediately on mount before the
// screen's own load takes over. Long enough to cover splash -> first frame,
// short enough that a backgrounded-then-resumed app never shows stale money.
const FRESH_MS = 60_000;

let snapshot: { at: number; data: MatchdaySnapshot } | null = null;
let inflight: Promise<MatchdaySnapshot> | null = null;

async function fetchMatchday(): Promise<MatchdaySnapshot> {
  const [matchesRes, walletRes] = await Promise.all([api.getMatches(), api.getWallet()]);
  return {
    matches: matchesRes.matches,
    available: matchesRes.available,
    weeklyBanko: matchesRes.weeklyBanko,
    wallet: {
      openCount: walletRes.wallet.openCount,
      lockedInOpen: walletRes.wallet.lockedInOpen,
      potentialReturn: walletRes.wallet.potentialReturn,
      total: walletRes.wallet.total,
    },
  };
}

// Kick off (or reuse) a Maç Günü fetch. Called from the boot splash so the
// data is in flight — ideally already home — before the screen mounts, and
// again by the screen itself on focus. Concurrent callers share one request;
// once it settles the next call starts a fresh one (pull-to-refresh, a
// resumed app, reload() after placing a bet).
export function prefetchMatchday(): Promise<MatchdaySnapshot> {
  if (inflight) return inflight;
  inflight = fetchMatchday()
    .then((data) => {
      snapshot = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// The most recent snapshot if it's still fresh, for a synchronous first paint.
// Non-consuming and side-effect free — the screen still runs its own load.
export function peekMatchday(): MatchdaySnapshot | null {
  if (snapshot && Date.now() - snapshot.at < FRESH_MS) return snapshot.data;
  return null;
}
