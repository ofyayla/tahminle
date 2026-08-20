import { StyleSheet, Text, View } from "react-native";
import TeamAvatar from "./TeamAvatar";
import OddsButton from "./OddsButton";
import Countdown from "./Countdown";
import CommunityPulseBar from "./CommunityPulseBar";
import ExtraMarketsPanel from "./ExtraMarketsPanel";
import { formatMatchDate, formatTime } from "@/lib/format";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";
import { colors, fonts, radii } from "@/lib/theme";
import { IconCalendar, IconClock } from "./icons";

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
  const matchClosed = match.status === "finished";
  const choice1X2 = match.openByMarket["1X2"];
  const disabled1X2 = matchClosed || choice1X2 != null;
  const openEntries = Object.entries(match.openByMarket);

  return (
    <View style={[styles.card, featured && styles.featured]}>
      {featured && <View style={styles.featuredBar} />}

      <View style={styles.topRow}>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: match.status === "live" ? colors.red : colors.green }]} />
          <Text style={styles.topRowText}>{featured ? "SIRADAKI BÜYÜK MAÇ" : match.league ?? "Süper Lig"}</Text>
        </View>
        <View style={styles.countdownRow}>
          <IconClock size={14} color={colors.gold} />
          <Countdown kickoff={match.kickoff} style={styles.countdown} />
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <TeamAvatar name={match.homeTeam} size={featured ? 56 : 44} />
          <Text style={styles.teamName} numberOfLines={1}>
            {match.homeTeam}
          </Text>
        </View>
        <View style={styles.vsCol}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.vsTime}>{formatTime(kickoff)}</Text>
        </View>
        <View style={styles.teamCol}>
          <TeamAvatar name={match.awayTeam} size={featured ? 56 : 44} />
          <Text style={styles.teamName} numberOfLines={1}>
            {match.awayTeam}
          </Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <IconCalendar size={14} color={colors.inkDim} />
        <Text style={styles.dateText}>{formatMatchDate(kickoff)}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <OddsButton
          label="1"
          value={match.oddsHome}
          prevValue={match.prevOddsHome}
          disabled={disabled1X2}
          selected={choice1X2 === "1"}
          onPress={() => onPick("1X2", "1")}
        />
        <OddsButton
          label="X"
          value={match.oddsDraw}
          prevValue={match.prevOddsDraw}
          disabled={disabled1X2}
          selected={choice1X2 === "X"}
          onPress={() => onPick("1X2", "X")}
        />
        <OddsButton
          label="2"
          value={match.oddsAway}
          prevValue={match.prevOddsAway}
          disabled={disabled1X2}
          selected={choice1X2 === "2"}
          onPress={() => onPick("1X2", "2")}
        />
      </View>

      {openEntries.length > 0 && (
        <View style={{ marginTop: 10, gap: 2 }}>
          {openEntries.map(([market, choice]) => (
            <Text key={market} style={styles.openPick}>
              {getMarketName(market as MarketCode)}: {getChoiceLabel(match, market as MarketCode, choice)}
            </Text>
          ))}
        </View>
      )}
      {matchClosed && <Text style={styles.closedText}>Maç sonuçlandı</Text>}

      <ExtraMarketsPanel match={match} matchClosed={matchClosed} onPick={onPick} />
      <CommunityPulseBar pulse={match.pulse} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 16,
    overflow: "hidden",
  },
  featured: { borderColor: `${colors.gold}66` },
  featuredBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.gold },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  topRowText: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.semibold },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  countdown: { color: colors.gold, fontSize: 11, fontFamily: fonts.semibold },
  teamsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  teamCol: { flex: 1, alignItems: "center", gap: 8 },
  teamName: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold, textAlign: "center" },
  vsCol: { alignItems: "center", paddingHorizontal: 8 },
  vs: { color: colors.inkFaint, fontSize: 13, fontFamily: fonts.display },
  vsTime: { color: colors.inkFaint, fontSize: 12, fontFamily: fonts.regular, marginTop: 4 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 },
  dateText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular },
  openPick: { textAlign: "center", color: colors.gold, fontSize: 12, fontFamily: fonts.semibold },
  closedText: { textAlign: "center", color: colors.inkFaint, fontSize: 12, fontFamily: fonts.semibold, marginTop: 10 },
});
