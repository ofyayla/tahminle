import { prisma } from "./prisma";
import { fetchOddsFromBackend, type BackendOddsMatch } from "./oddsBackend";
import { buildMatchKey, isSameFixture } from "./matchKey";

const BULLETIN_URL = "https://cdnbulten.nesine.com/api/bulten/getprebultenfull";

export const TRACKED_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş"];
const MATCH_WINNER_MARKET = 1; // MTID for 1-X-2 (Maç Sonucu)

type NesineOdd = { N: number; O: number };
type NesineMarket = { MTID: number; OCA: NesineOdd[] };
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
    (e) => e.GT === 1 && e.HN && e.AN && isTrackedMatch(e.HN, e.AN)
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
    results.push({
      externalId: buildMatchKey(ev.HN!, ev.AN!, kickoff),
      homeTeam: ev.HN!,
      awayTeam: ev.AN!,
      league: "Süper Lig",
      kickoff,
      oddsHome,
      oddsDraw,
      oddsAway,
      over25: null,
      under25: null,
      bttsYes: null,
      bttsNo: null,
      dc1X: null,
      dc12: null,
      dcX2: null,
      extraMarkets: null,
    });
  }

  return results;
}

async function fetchTrackedMatches(): Promise<BackendOddsMatch[]> {
  try {
    const backendMatches = await fetchOddsFromBackend();
    if (backendMatches.length > 0) return backendMatches;
  } catch (err) {
    console.error("Oran backend'i alınamadı, Nesine'ye geçiliyor:", err);
  }

  return fetchFromNesine();
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

  const results = await Promise.all(
    matches.map((m) => {
      let existing = byExternalId.get(m.externalId);
      if (!existing) {
        existing = candidateRows.find((row) => !claimed.has(row.id) && isSameFixture(m, row));
      }
      if (existing) claimed.add(existing.id);

      const data = {
        externalId: m.externalId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
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

      return prisma.match.create({
        data: { ...data, league: m.league },
      });
    })
  );

  return results;
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
