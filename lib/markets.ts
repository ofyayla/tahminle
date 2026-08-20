export type MarketCode = "1X2" | "OU25" | "BTTS" | "DC";

export type MatchOddsSource = {
  homeTeam: string;
  awayTeam: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
  dc1X: number | null;
  dc12: number | null;
  dcX2: number | null;
};

const VALID_CHOICES: Record<MarketCode, string[]> = {
  "1X2": ["1", "X", "2"],
  OU25: ["OVER", "UNDER"],
  BTTS: ["YES", "NO"],
  DC: ["1X", "12", "X2"],
};

export function isValidChoice(market: MarketCode, choice: string): boolean {
  return VALID_CHOICES[market]?.includes(choice) ?? false;
}

// The odds value locked in for a given market + choice, or null if that
// selection isn't available for this match (provider didn't supply it).
export function getOddsFor(match: MatchOddsSource, market: MarketCode, choice: string): number | null {
  if (market === "1X2") {
    if (choice === "1") return match.oddsHome;
    if (choice === "X") return match.oddsDraw;
    if (choice === "2") return match.oddsAway;
  }
  if (market === "OU25") {
    if (choice === "OVER") return match.over25;
    if (choice === "UNDER") return match.under25;
  }
  if (market === "BTTS") {
    if (choice === "YES") return match.bttsYes;
    if (choice === "NO") return match.bttsNo;
  }
  if (market === "DC") {
    if (choice === "1X") return match.dc1X;
    if (choice === "12") return match.dc12;
    if (choice === "X2") return match.dcX2;
  }
  return null;
}

// Human-readable Turkish label for a market + choice, e.g. "Galatasaray kazanır",
// "2.5 Üst", "Karşılıklı Gol Var", "Çifte Şans 1-X".
export function getChoiceLabel(
  match: { homeTeam: string; awayTeam: string },
  market: MarketCode,
  choice: string
): string {
  if (market === "1X2") {
    if (choice === "1") return `${match.homeTeam} kazanır`;
    if (choice === "X") return "Berabere";
    if (choice === "2") return `${match.awayTeam} kazanır`;
  }
  if (market === "OU25") {
    return choice === "OVER" ? "2.5 Üst" : "2.5 Alt";
  }
  if (market === "BTTS") {
    return choice === "YES" ? "Karşılıklı Gol Var" : "Karşılıklı Gol Yok";
  }
  if (market === "DC") {
    if (choice === "1X") return `Çifte Şans ${match.homeTeam} / Berabere`;
    if (choice === "12") return `Çifte Şans ${match.homeTeam} / ${match.awayTeam}`;
    if (choice === "X2") return `Çifte Şans Berabere / ${match.awayTeam}`;
  }
  return choice;
}

export function getMarketName(market: MarketCode): string {
  switch (market) {
    case "1X2":
      return "Maç Sonucu";
    case "OU25":
      return "2.5 Gol Alt/Üst";
    case "BTTS":
      return "Karşılıklı Gol";
    case "DC":
      return "Çifte Şans";
  }
}

// Human-readable label for what actually happened, for a given market, once a
// match is settled. DC has no result of its own — it's decided by the 1X2
// outcome, so that's what gets shown.
export function getActualResultLabel(
  match: { homeTeam: string; awayTeam: string },
  market: MarketCode,
  result: { result: string | null; resultOver25: boolean | null; resultBtts: boolean | null }
): string | null {
  if (market === "1X2" || market === "DC") {
    return result.result ? getChoiceLabel(match, "1X2", result.result) : null;
  }
  if (market === "OU25") {
    return result.resultOver25 == null ? null : getChoiceLabel(match, "OU25", result.resultOver25 ? "OVER" : "UNDER");
  }
  if (market === "BTTS") {
    return result.resultBtts == null ? null : getChoiceLabel(match, "BTTS", result.resultBtts ? "YES" : "NO");
  }
  return null;
}

// Whether a settled match's simulated outcome satisfies this market + choice.
export function isWinningChoice(
  market: MarketCode,
  choice: string,
  result: { result: string | null; resultOver25: boolean | null; resultBtts: boolean | null }
): boolean {
  if (market === "1X2") return choice === result.result;
  if (market === "OU25") {
    if (result.resultOver25 == null) return false;
    return choice === (result.resultOver25 ? "OVER" : "UNDER");
  }
  if (market === "BTTS") {
    if (result.resultBtts == null) return false;
    return choice === (result.resultBtts ? "YES" : "NO");
  }
  if (market === "DC") {
    if (!result.result) return false;
    if (choice === "1X") return result.result === "1" || result.result === "X";
    if (choice === "12") return result.result === "1" || result.result === "2";
    if (choice === "X2") return result.result === "X" || result.result === "2";
  }
  return false;
}
