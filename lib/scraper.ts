import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { fetchOddsFromBackend, type BackendOddsMatch } from "./oddsBackend";
import { buildMatchKey, isSameFixture, isVirtualFixture } from "./matchKey";

const BULLETIN_URL = "https://cdnbulten.nesine.com/api/bulten/getprebultenfull";

export const TRACKED_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor"];
// Nesine market type ids. The bulletin ships no market/outcome name
// dictionary — only these numeric MTIDs and per-outcome numbers (N) — so each
// mapping below was pinned down against the whole bulletin (670 fixtures)
// rather than by matching a single match's odds, which is ambiguous:
//   1  Maç Sonucu     N1=1, N2=X, N3=2.
//   3  Çifte Şans     N1=1X, N2=12, N3=X2. Its three implied probabilities
//      sum to ~2 (each outcome covers two of the three results), and the
//      1X/12/X2 order is the unanimous best fit against MTID 1 on all 275
//      fixtures carrying both (mean error 0.019).
//   12 2.5 Gol Alt/Üst  N1=Alt, N2=Üst, at SOV 2.5. Sits in a ladder with
//      MTID 11 (SOV 1.5) and 13 (SOV 3.5); P(Üst) decreases monotonically
//      across that ladder on all 149 fixtures carrying all three.
//   38 Karşılıklı Gol   N1=Var, N2=Yok. P(Var) correlates +0.84 with
//      P(Üst 2.5) and −0.25 with how lopsided the 1X2 is — the KG signature.
//
// Do not swap these for a neighbouring id that merely looks close on one
// match: MTID 8 and 49 are near-misses that the external odds backend reads
// by mistake (see fetchTrackedMatches), and both fail the checks above.
const MATCH_WINNER_MARKET = 1; // MTID for 1-X-2 (Maç Sonucu)
const DOUBLE_CHANCE_MARKET = 3;
const OVER_UNDER_MARKET = 12;
const OVER_UNDER_LINE = 2.5; // SOV selecting the 2.5 line out of the ladder
const BTTS_MARKET = 38;

// Nesine publishes 1.00 for an outcome it isn't actually taking action on
// (suspended, or so far gone it's been floored). It's not a real price — a
// pick at 1.00 returns exactly the stake — so treat it as "not offered".
function odd(market: NesineMarket | undefined, outcome: number): number | null {
  const value = market?.OCA.find((o) => o.N === outcome)?.O;
  return value != null && value > 1.01 ? value : null;
}

type NesineOdd = { N: number; O: number };
// SOV is the market's "special odds value" — the line for a handicap/total
// market (2.5 for the 2.5 goal over/under), and 0 for markets without one.
type NesineMarket = { MTID: number; SOV?: number; OCA: NesineOdd[] };
type NesineEvent = {
  C: number;
  HN?: string;
  AN?: string;
  GT: number;
  LC?: number;
  D?: string;
  T?: string;
  ESD?: number;
  MA: NesineMarket[];
};

function isTrackedMatch(homeTeam: string, awayTeam: string) {
  return TRACKED_TEAMS.some((t) => homeTeam.includes(t) || awayTeam.includes(t));
}

async function fetchFromNesine(): Promise<BackendOddsMatch[]> {
  const res = await fetch(BULLETIN_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TahminleBot/1.0)",
      Referer: "https://www.nesine.com/iddaa",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Bülten alınamadı: ${res.status}`);
  }

  const data = await res.json();
  const events: NesineEvent[] = data?.sg?.EA ?? [];

  const footballMatches = events.filter(
    (e) => e.GT === 1 && e.HN && e.AN && isTrackedMatch(e.HN, e.AN) && !isVirtualFixture(e.HN, e.AN)
  );

  const results: BackendOddsMatch[] = [];

  for (const ev of footballMatches) {
    const marketWinner = ev.MA?.find((m) => m.MTID === MATCH_WINNER_MARKET);
    if (!marketWinner) continue;

    const oddsHome = marketWinner.OCA.find((o) => o.N === 1)?.O;
    const oddsDraw = marketWinner.OCA.find((o) => o.N === 2)?.O;
    const oddsAway = marketWinner.OCA.find((o) => o.N === 3)?.O;
    if (oddsHome == null || oddsDraw == null || oddsAway == null) continue;

    const kickoff = ev.ESD ? new Date(ev.ESD) : new Date();
    const overUnder = ev.MA.find(
      (m) => m.MTID === OVER_UNDER_MARKET && m.SOV === OVER_UNDER_LINE
    );
    const btts = ev.MA.find((m) => m.MTID === BTTS_MARKET);
    const doubleChance = ev.MA.find((m) => m.MTID === DOUBLE_CHANCE_MARKET);

    results.push({
      externalId: buildMatchKey(ev.HN!, ev.AN!, kickoff),
      homeTeam: ev.HN!,
      awayTeam: ev.AN!,
      league: "Süper Lig",
      kickoff,
      oddsHome,
      oddsDraw,
      oddsAway,
      under25: odd(overUnder, 1),
      over25: odd(overUnder, 2),
      bttsYes: odd(btts, 1),
      bttsNo: odd(btts, 2),
      dc1X: odd(doubleChance, 1),
      dc12: odd(doubleChance, 2),
      dcX2: odd(doubleChance, 3),
      // Maç Skoru (MTID 777) is deliberately left out: its 29 outcome numbers
      // carry no scoreline labels, and the tail is a flat wall of identical
      // long-shot prices, so the outcome→"H:A" mapping can't be pinned down
      // the way the markets above were. A wrong guess here would lock a pick
      // to the wrong scoreline, so it stays unavailable rather than unsafe.
      extraMarkets: null,
    });
  }

  return results;
}

// superlig-odds-backend (ayrı bir servis, bu reponun dışında) şu an yalnızca
// GS/FB/BJK'yı hedefliyor — target_teams alanı bunu doğruluyor. O servisin
// kaynağına erişimimiz yok, o yüzden Trabzonspor (ve backend'in gözden
// kaçırdığı herhangi bir GS/FB/BJK maçı) için Nesine bültenini her zaman
// ayrıca çekip birleştiriyoruz; artık "backend boşsa Nesine'ye düş" değil,
// "backend'in kapsamadığını Nesine'den tamamla" mantığı.
async function fetchTrackedMatches(): Promise<BackendOddsMatch[]> {
  const [backendMatches, nesineMatches] = await Promise.all([
    fetchOddsFromBackend().catch((err) => {
      console.error("Oran backend'i alınamadı:", err);
      return [] as BackendOddsMatch[];
    }),
    fetchFromNesine().catch((err) => {
      console.error("Nesine bülteni alınamadı:", err);
      return [] as BackendOddsMatch[];
    }),
  ]);

  // Backend yalnızca Maç Skoru'nda (extra_markets) benzersiz — alt/üst, KG ve
  // çifte şans alanlarında bültendeki yanlış marketleri okuyor: çifte şans
  // için MTID 3 yerine 8'i, KG için 38 yerine 49'u, 2.5 alt/üst için de
  // marjı imkânsız (~%0.5) bir kaynağı veriyor. Bu üç grubu, MTID eşlemesi
  // bülten geneline karşı doğrulanmış olan Nesine'den alıp backend'inkinin
  // üzerine yazıyoruz; 1X2 ve Maç Skoru backend'den gelmeye devam ediyor.
  const merged = backendMatches.map((b) => {
    const n = nesineMatches.find((m) => isSameFixture(m, b));
    if (!n) return b;
    return {
      ...b,
      over25: n.over25,
      under25: n.under25,
      bttsYes: n.bttsYes,
      bttsNo: n.bttsNo,
      dc1X: n.dc1X,
      dc12: n.dc12,
      dcX2: n.dcX2,
    };
  });
  // Backend'de hiç olmayan maçları (bugün itibariyle Trabzonspor'un tamamı)
  // olduğu gibi Nesine'den ekle.
  for (const m of nesineMatches) {
    if (!merged.some((b) => isSameFixture(m, b))) merged.push(m);
  }
  return merged;
}

export async function scrapeAndUpdateMatches() {
  const matches = await fetchTrackedMatches();
  if (matches.length === 0) return [];

  // Reconcile against every not-yet-finished match, not just an exact
  // externalId lookup: a source can rename a fixture's opponent mid-lifecycle
  // (e.g. Nesine's "Erzurumspor FK" disappearing mid-match, leaving only
  // The-Odds-API's "Erzurum BB" for the same club), which would otherwise
  // compute a different key and duplicate the row instead of updating it.
  const candidateRows = await prisma.match.findMany({
    where: { status: { in: ["upcoming", "live"] } },
  });
  const byExternalId = new Map(candidateRows.map((row) => [row.externalId, row]));
  const claimed = new Set<string>();

  // A source can keep listing a fixture whose row is already "finished" or
  // "postponed" here (stale bulletin, a just-ended match). Those aren't in
  // candidateRows, so without this guard the branch below would `create` a
  // second row with the same externalId — a unique-constraint crash — or, if
  // it somehow updated, drag a settled match back to "live". Skip them.
  const settledExternalIds = new Set(
    (
      await prisma.match.findMany({
        where: {
          externalId: { in: matches.map((m) => m.externalId) },
          status: { in: ["finished", "postponed"] },
        },
        select: { externalId: true },
      })
    ).map((row) => row.externalId)
  );

  const results = await Promise.all(
    matches.map((m) => {
      let existing = byExternalId.get(m.externalId);
      if (!existing) {
        existing = candidateRows.find((row) => !claimed.has(row.id) && isSameFixture(m, row));
      }
      if (!existing && settledExternalIds.has(m.externalId)) return null;
      if (existing) claimed.add(existing.id);

      const data = {
        externalId: m.externalId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        kickoff: m.kickoff,
        oddsHome: m.oddsHome,
        oddsDraw: m.oddsDraw,
        oddsAway: m.oddsAway,
        prevOddsHome: existing?.oddsHome ?? null,
        prevOddsDraw: existing?.oddsDraw ?? null,
        prevOddsAway: existing?.oddsAway ?? null,
        over25: m.over25,
        under25: m.under25,
        bttsYes: m.bttsYes,
        bttsNo: m.bttsNo,
        dc1X: m.dc1X,
        dc12: m.dc12,
        dcX2: m.dcX2,
        extraMarkets: m.extraMarkets ?? undefined,
        oddsUpdatedAt: new Date(),
        status: m.kickoff.getTime() < Date.now() ? "live" : "upcoming",
      };

      if (existing) {
        return prisma.match.update({ where: { id: existing.id }, data });
      }

      // Concurrent scrape ticks (or a second serverless instance) can both
      // reach here for the same brand-new fixture; let the loser fall back to
      // an update instead of throwing a unique-constraint error.
      return prisma.match.create({ data }).catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return prisma.match.update({ where: { externalId: m.externalId }, data });
        }
        throw err;
      });
    })
  );

  return results.filter((row) => row !== null);
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let lastRefresh = 0;
let refreshPromise: Promise<unknown> | null = null;

export async function ensureFreshMatches() {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_INTERVAL_MS) return;
  if (refreshPromise) return refreshPromise;

  refreshPromise = scrapeAndUpdateMatches()
    .then(() => {
      lastRefresh = Date.now();
    })
    .catch((err) => {
      console.error("Oran güncelleme hatası:", err);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
