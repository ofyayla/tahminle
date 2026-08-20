import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TeamAvatar from "./TeamAvatar";
import { formatOdds, formatTL } from "@/lib/format";
import { getChoiceLabel, getMarketName, type MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

const QUICK_STAKES = [50, 100, 250, 500];

export default function StakeModal({
  match,
  market,
  choice,
  odds,
  available,
  onClose,
  onSuccess,
}: {
  match: MatchDTO;
  market: MarketCode;
  choice: string;
  odds: number;
  available: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [stake, setStake] = useState(String(Math.min(100, available)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stakeNum = Number(stake) || 0;
  const potential = Math.round(stakeNum * odds);
  const choiceText = getChoiceLabel(match, market, choice);
  const marketName = getMarketName(market);

  async function submit() {
    setError(null);
    if (stakeNum < 10) {
      setError("En az ₺10 stake girmelisin.");
      return;
    }
    if (stakeNum > available) {
      setError("Sanal bakiyen bu miktar için yeterli değil.");
      return;
    }
    setLoading(true);
    try {
      await api.placePrediction(match.id, market, choice, stakeNum);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tahmin oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>TAHMİNİNİ KUR</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <View style={styles.matchRow}>
            <TeamAvatar name={match.homeTeam} size={36} />
            <Text style={styles.matchText} numberOfLines={1}>
              {match.homeTeam} – {match.awayTeam}
            </Text>
            <TeamAvatar name={match.awayTeam} size={36} />
          </View>

          <View style={styles.pickBox}>
            <Text style={styles.pickMarket}>{marketName}</Text>
            <View style={styles.pickRow}>
              <Text style={styles.pickChoice}>{choiceText}</Text>
              <Text style={styles.pickOdds}>{formatOdds(odds)}</Text>
            </View>
          </View>

          <View style={styles.stakeHeaderRow}>
            <Text style={styles.stakeLabel}>Sanal Stake</Text>
            <Text style={styles.stakeAvailable}>Kullanılabilir: {formatTL(available)}</Text>
          </View>
          <TextInput style={styles.input} keyboardType="number-pad" value={stake} onChangeText={setStake} />
          <View style={styles.quickRow}>
            {QUICK_STAKES.map((s) => (
              <Pressable
                key={s}
                disabled={s > available}
                onPress={() => setStake(String(s))}
                style={[styles.quickChip, s > available && { opacity: 0.3 }]}
              >
                <Text style={styles.quickChipText}>₺{s}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.potentialRow}>
            <Text style={styles.stakeLabel}>Olası dönüş</Text>
            <Text style={styles.potentialValue}>{formatTL(potential)}</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.submit, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.submitText}>Tahmini Kilitle</Text>}
          </Pressable>
          <Text style={styles.disclaimer}>Gerçek para içermez · Tüm bakiyeler sanaldır.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  close: { color: colors.inkDim, fontSize: 24, lineHeight: 24 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii["2xl"],
    padding: 12,
    marginBottom: 16,
  },
  matchText: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 13, textAlign: "center" },
  pickBox: {
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    backgroundColor: `${colors.gold}1A`,
    borderRadius: radii["2xl"],
    padding: 12,
    marginBottom: 16,
  },
  pickMarket: { color: colors.goldDim, fontSize: 11, textTransform: "uppercase", fontFamily: fonts.regular, marginBottom: 4 },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickChoice: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
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
  stakeHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  stakeLabel: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.semibold, textTransform: "uppercase" },
  stakeAvailable: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.semibold },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 16 },
  quickChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickChipText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.semibold },
  potentialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  potentialValue: { color: colors.green, fontFamily: fonts.display, fontSize: 15 },
  error: {
    color: colors.red,
    fontSize: 13,
    fontFamily: fonts.regular,
    marginBottom: 12,
    textAlign: "center",
    backgroundColor: `${colors.red}1A`,
    borderRadius: radii.lg,
    paddingVertical: 8,
  },
  submit: { backgroundColor: colors.gold, borderRadius: radii.xl, paddingVertical: 14, alignItems: "center" },
  submitText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
  disclaimer: { textAlign: "center", color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 8 },
});
