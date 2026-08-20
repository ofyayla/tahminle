import { prisma } from "./prisma";
import { fetchOddsFromBackend, type BackendOddsMatch } from "./oddsBackend";
import { buildMatchKey } from "./matchKey";

const BULLETIN_URL = "https://cdnbulten.nesine.com/api/bulten/getprebultenfull";

const TRACKED_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş"];
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

// The set of externalIds the odds source actually returned on the most
// recent successful scrape. A match that has kicked off but has dropped out
// of this set (e.g. a competition our results provider doesn't cover, or the
// source simply stopped listing it) will never receive fresh odds or a real
// result again — settlement treats that as a signal to stop waiting.
let lastSourcedExternalIds: Set<string> = new Set();

export function isCurrentlySourced(externalId: string): boolean {
  return lastSourcedExternalIds.has(externalId);
}

export async function scrapeAndUpdateMatches() {
  const matches = await fetchTrackedMatches();
  if (matches.length === 0) return [];

  lastSourcedExternalIds = new Set(matches.map((m) => m.externalId));

  const existingRows = await prisma.match.findMany({
    where: { externalId: { in: matches.map((m) => m.externalId) } },
  });
  const existingById = new Map(existingRows.map((row) => [row.externalId, row]));

  const results = await Promise.all(
    matches.map((m) => {
      const existing = existingById.get(m.externalId);

      return prisma.match.upsert({
        where: { externalId: m.externalId },
        update: {
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
        },
        create: {
          externalId: m.externalId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league,
          kickoff: m.kickoff,
          oddsHome: m.oddsHome,
          oddsDraw: m.oddsDraw,
          oddsAway: m.oddsAway,
          over25: m.over25,
          under25: m.under25,
          bttsYes: m.bttsYes,
          bttsNo: m.bttsNo,
          dc1X: m.dc1X,
          dc12: m.dc12,
          dcX2: m.dcX2,
          extraMarkets: m.extraMarkets ?? undefined,
          status: m.kickoff.getTime() < Date.now() ? "live" : "upcoming",
        },
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
