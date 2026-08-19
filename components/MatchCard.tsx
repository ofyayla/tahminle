import TeamAvatar from "./TeamAvatar";
import OddsButton from "./OddsButton";
import Countdown from "./Countdown";
import CommunityPulseBar from "./CommunityPulseBar";
import { formatMatchDate, formatTime } from "@/lib/format";
import type { MatchDTO } from "@/lib/types";

export default function MatchCard({
  match,
  featured,
  onPick,
}: {
  match: MatchDTO;
  featured?: boolean;
  onPick: (choice: "1" | "X" | "2") => void;
}) {
  const kickoff = new Date(match.kickoff);
  const disabled = match.hasOpenPrediction || match.status === "finished";

  return (
    <div
      className={`rounded-2xl border bg-card p-4 ${
        featured ? "border-gold/40 relative overflow-hidden" : "border-card-border"
      }`}
    >
      {featured && <div className="absolute left-0 top-0 h-full w-1 bg-gold" />}
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-ink-dim">
          <span className={`h-1.5 w-1.5 rounded-full ${match.status === "live" ? "bg-red animate-pulse" : "bg-green"}`} />
          {featured ? "SIRADAKI BÜYÜK MAÇ" : match.league ?? "Süper Lig"}
        </span>
        <span className="flex items-center gap-1 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
          <Countdown kickoff={match.kickoff} />
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamAvatar name={match.homeTeam} size={featured ? 56 : 44} />
          <span className="text-center text-sm font-bold">{match.homeTeam}</span>
        </div>
        <div className="flex flex-col items-center px-2 text-ink-faint">
          <span className="font-display text-sm">VS</span>
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
        <OddsButton label="1" value={match.oddsHome} prevValue={match.prevOddsHome} disabled={disabled} selected={match.predictedChoice === "1"} onClick={() => onPick("1")} />
        <OddsButton label="X" value={match.oddsDraw} prevValue={match.prevOddsDraw} disabled={disabled} selected={match.predictedChoice === "X"} onClick={() => onPick("X")} />
        <OddsButton label="2" value={match.oddsAway} prevValue={match.prevOddsAway} disabled={disabled} selected={match.predictedChoice === "2"} onClick={() => onPick("2")} />
      </div>

      {match.hasOpenPrediction && (
        <p className="mt-3 text-center text-xs font-semibold text-gold">
          Tahminin: {match.predictedChoice === "1" ? match.homeTeam : match.predictedChoice === "2" ? match.awayTeam : "Berabere"}
        </p>
      )}
      {match.status === "finished" && (
        <p className="mt-3 text-center text-xs font-semibold text-ink-faint">Maç sonuçlandı</p>
      )}

      <CommunityPulseBar pulse={match.pulse} />
    </div>
  );
}
