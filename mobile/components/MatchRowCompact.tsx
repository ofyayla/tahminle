import { Pressable, StyleSheet, Text, View } from "react-native";
import TeamAvatar from "./TeamAvatar";
import { formatMatchDate, formatTime } from "@/lib/format";
import type { MatchDTO } from "@/lib/types";
import { colors, fonts, radii } from "@/lib/theme";
import { IconChevronDown } from "./icons";

// The condensed form used for every match after the featured one. Tapping it
// expands the full MatchCard in place, so the odds are one tap away without
// making the list a wall of cards.
export default function MatchRowCompact({
  match,
  expanded,
  onToggle,
}: {
  match: MatchDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const kickoff = new Date(match.kickoff);
  const isLive = match.status === "live";
  const hasPick = Object.keys(match.openByMarket).length > 0;

  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View style={styles.avatars}>
        <TeamAvatar name={match.homeTeam} size={40} />
        <View style={styles.awayAvatar}>
          <TeamAvatar name={match.awayTeam} size={40} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.teams} numberOfLines={1}>
          {match.homeTeam} – {match.awayTeam}
        </Text>
        <View style={styles.metaRow}>
          {isLive ? (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.live}>
                CANLI
                {match.liveScore ? ` · ${match.liveScore.home}-${match.liveScore.away}` : ""}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>
              {formatMatchDate(kickoff)} · {formatTime(kickoff)}
            </Text>
          )}
          {hasPick && <View style={styles.pickDot} />}
        </View>
      </View>

      <View style={[styles.chevron, expanded && styles.chevronOpen]}>
        <View style={{ transform: [{ rotate: expanded ? "180deg" : "270deg" }] }}>
          <IconChevronDown size={18} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  // The two crests overlap slightly, which reads as "these two are playing
  // each other" in a row this short.
  avatars: { flexDirection: "row", alignItems: "center" },
  awayAvatar: { marginLeft: -12 },
  body: { flex: 1, minWidth: 0 },
  teams: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  live: { color: colors.red, fontSize: 13, fontFamily: fonts.semibold },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  pickDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  chevron: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chevronOpen: { backgroundColor: `${colors.gold}26`, borderColor: `${colors.gold}66` },
});
