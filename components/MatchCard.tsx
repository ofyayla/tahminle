import TeamAvatar from "./TeamAvatar";
import OddsButton from "./OddsButton";
import Countdown from "./Countdown";
import LiveMinute from "./LiveMinute";
import CommunityPulseBar from "./CommunityPulseBar";
import ExtraMarketsPanel from "./ExtraMarketsPanel";
import { formatMatchDate, formatTime } from "@/lib/format";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";

export default function MatchCard({
  match,
  featured,
  onPick,
}: {
  match: MatchDTO;
  featured?: boolean;
  onPick: (market: MarketCode, choice: string) => void;
}) {
  const kickoff = new Date(match.kickoff);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  // Betting closes the moment a match kicks off — only "upcoming" matches are pickable.
  const bettingClosed = match.status !== "upcoming";
  const choice1X2 = match.openByMarket["1X2"];
  const disabled1X2 = bettingClosed || choice1X2 != null;

  const openEntries = Object.entries(match.openByMarket);

  return (
    <div
      className={`rounded-2xl border bg-card p-4 ${
        featured ? "border-gold/40 relative overflow-hidden" : "border-card-border"
      }`}
    >
      {featured && <div className="absolute left-0 top-0 h-full w-1 bg-gold" />}
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-ink-dim">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-red animate-pulse" : "bg-green"}`} />
          {featured ? "SIRADAKI BÜYÜK MAÇ" : match.league ?? "Süper Lig"}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 text-red">
            <span className="h-1.5 w-1.5 rounded-full bg-red animate-pulse" />
            CANLI · <LiveMinute kickoff={match.kickoff} />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
            <Countdown kickoff={match.kickoff} />
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamAvatar name={match.homeTeam} size={featured ? 56 : 44} />
          <span className="text-center text-sm font-bold">{match.homeTeam}</span>
        </div>
        <div className="flex flex-col items-center px-2 text-ink-faint">
          {match.liveScore ? (
            <span className="font-display text-lg text-ink">
              {match.liveScore.home}-{match.liveScore.away}
            </span>
          ) : (
            <span className="font-display text-sm">VS</span>
          )}
          <span className="mt-1 text-xs">{formatTime(kickoff)}</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamAvatar name={match.awayTeam} size={featured ? 56 : 44} />
          <span className="text-center text-sm font-bold">{match.awayTeam}</span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-ink-dim">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
        {formatMatchDate(kickoff)}
      </div>

      <div className="flex gap-2">
        <OddsButton label="1" value={match.oddsHome} prevValue={match.prevOddsHome} disabled={disabled1X2} selected={choice1X2 === "1"} onClick={() => onPick("1X2", "1")} />
        <OddsButton label="X" value={match.oddsDraw} prevValue={match.prevOddsDraw} disabled={disabled1X2} selected={choice1X2 === "X"} onClick={() => onPick("1X2", "X")} />
        <OddsButton label="2" value={match.oddsAway} prevValue={match.prevOddsAway} disabled={disabled1X2} selected={choice1X2 === "2"} onClick={() => onPick("1X2", "2")} />
      </div>

      {openEntries.length > 0 && (
        <div className="mt-3 space-y-1">
          {openEntries.map(([market, choice]) => (
            <p key={market} className="text-center text-xs font-semibold text-gold">
              {getMarketName(market as MarketCode)}: {getChoiceLabel(match, market as MarketCode, choice)}
            </p>
          ))}
        </div>
      )}
      {isLive && (
        <p className="mt-3 text-center text-xs font-semibold text-ink-faint">Maç başladı — tahmin kilitlendi</p>
      )}
      {isFinished && (
        <p className="mt-3 text-center text-xs font-semibold text-ink-faint">Maç sonuçlandı</p>
      )}

      <ExtraMarketsPanel match={match} matchClosed={bettingClosed} onPick={onPick} />
      <CommunityPulseBar pulse={match.pulse} />
    </div>
  );
}
