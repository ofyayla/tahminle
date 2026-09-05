import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import TeamAvatar from "./TeamAvatar";
import { formatMatchDate, formatOdds, formatTime, formatTL } from "@/lib/format";
import { getActualResultLabel, getChoiceLabel, getMarketName } from "@/lib/markets";
import type { PredictionDTO } from "@/lib/predictionTypes";
import { colors, fonts, radii } from "@/lib/theme";
import { IconCheck, IconChevronDown, IconClock, IconUndo, IconX } from "./icons";

export default function PredictionCard({ prediction }: { prediction: PredictionDTO }) {
  const [open, setOpen] = useState(false);

  const { match } = prediction;
  const kickoff = new Date(match.kickoff);
  const choiceText = getChoiceLabel(match, prediction.market, prediction.choice);
  const marketName = getMarketName(prediction.market);
  const resultText = getActualResultLabel(match, prediction.market, match);
  const potential = Math.round(prediction.stake * prediction.oddsAtPick);
  const isSettled = prediction.status !== "open";
  const walletEffect =
    prediction.status === "won"
      ? (prediction.payout ?? 0)
      : prediction.status === "cancelled"
      ? prediction.stake
      : -prediction.stake;

  const statusMeta =
    prediction.status === "open"
      ? { label: "Maç bekleniyor", color: colors.gold, Icon: IconClock }
      : prediction.status === "won"
      ? { label: "Kazandın", color: colors.green, Icon: IconCheck }
      : prediction.status === "cancelled"
      ? { label: "Ertelendi · İade edildi", color: colors.inkDim, Icon: IconUndo }
      : { label: "Kaybettin", color: colors.red, Icon: IconX };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.statusRow}>
          <statusMeta.Icon size={14} color={statusMeta.color} />
          <Text style={[styles.status, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
        <Text style={styles.date}>
          {prediction.status === "open"
            ? `${formatMatchDate(kickoff)} · ${formatTime(kickoff)}`
            : prediction.settledAt && formatMatchDate(new Date(prediction.settledAt))}
        </Text>
      </View>

      <View style={styles.matchRow}>
        <TeamAvatar name={match.homeTeam} size={32} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.matchTitle}>
            {match.homeTeam} – {match.awayTeam}
          </Text>
          <Text style={styles.matchSub}>
            {formatMatchDate(kickoff)} · {formatTime(kickoff)}
          </Text>
        </View>
        <TeamAvatar name={match.awayTeam} size={32} />
      </View>

      <View style={styles.pickRow}>
        <View>
          <Text style={styles.pickMarket}>{marketName}</Text>
          <Text style={styles.pickChoice}>{choiceText}</Text>
        </View>
        <Text style={styles.pickOdds}>{formatOdds(prediction.oddsAtPick)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Sanal Stake</Text>
          <Text style={styles.statValue}>{formatTL(prediction.stake)}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Kilitli Oran</Text>
          <Text style={styles.statValue}>{formatOdds(prediction.oddsAtPick)}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>
            {prediction.status === "open"
              ? "Olası Dönüş"
              : prediction.status === "cancelled"
              ? "İade"
              : "Sonuç"}
          </Text>
          <Text
            style={[
              styles.statValue,
              prediction.status === "won" && { color: colors.green },
              prediction.status === "lost" && { color: colors.red },
              prediction.status === "cancelled" && { color: colors.inkDim },
            ]}
          >
            {prediction.status === "lost"
              ? `-${formatTL(prediction.stake)}`
              : prediction.status === "cancelled"
              ? `+${formatTL(prediction.stake)}`
              : formatTL(prediction.status === "won" ? prediction.payout ?? 0 : potential)}
          </Text>
        </View>
      </View>

      {isSettled && (
        <View style={styles.detailWrap}>
          <Pressable style={styles.detailToggleRow} onPress={() => setOpen((o) => !o)}>
            <Text style={styles.detailToggle}>Maç sonu detayını {open ? "kapat" : "aç"}</Text>
            <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
              <IconChevronDown size={14} color={colors.inkDim} />
            </View>
          </Pressable>
          {open && (
            <View style={styles.detailBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gerçek sonuç</Text>
                <Text style={styles.detailValue}>
                  {prediction.status === "cancelled" ? "Belirlenemedi" : resultText ?? "Bekleniyor"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Senin tahminin</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        prediction.status === "won"
                          ? colors.green
                          : prediction.status === "cancelled"
                          ? colors.inkDim
                          : colors.red,
                    },
                  ]}
                >
                  {choiceText}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Maç tarihi</Text>
                <Text style={styles.detailValue}>
                  {formatMatchDate(kickoff)} · {formatTime(kickoff)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sonuçlanma tarihi</Text>
                <Text style={styles.detailValue}>
                  {prediction.settledAt
                    ? `${formatMatchDate(new Date(prediction.settledAt))} · ${formatTime(new Date(prediction.settledAt))}`
                    : "-"}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.detailDivider]}>
                <Text style={styles.detailLabel}>Sanal stake</Text>
                <Text style={styles.detailValue}>{formatTL(prediction.stake)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cüzdan etkisi</Text>
                <Text style={[styles.detailValueDisplay, { color: walletEffect >= 0 ? colors.green : colors.red }]}>
                  {walletEffect >= 0 ? "+" : "−"}
                  {formatTL(Math.abs(walletEffect))}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { fontSize: 11, fontFamily: fonts.semibold },
  date: { fontSize: 11, fontFamily: fonts.regular, color: colors.inkFaint },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  matchTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  matchSub: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  pickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pickMarket: { color: colors.inkDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  pickChoice: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  pickOdds: {
    backgroundColor: colors.gold,
    color: colors.bg,
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  statsRow: { flexDirection: "row" },
  statCol: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 10, fontFamily: fonts.semibold, color: colors.inkDim, textTransform: "uppercase" },
  statValue: { fontSize: 14, fontFamily: fonts.display, color: colors.ink, marginTop: 4 },
  detailWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  detailToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  detailToggle: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  detailBox: { marginTop: 12, backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: 14, gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10 },
  detailLabel: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  detailValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  detailValueDisplay: { fontFamily: fonts.display, fontSize: 13 },
});
