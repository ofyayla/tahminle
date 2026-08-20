import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";
import { IconPeople } from "./icons";

export default function CommunityPulseBar({
  pulse,
}: {
  pulse: { total: number; home: number; draw: number; away: number };
}) {
  if (pulse.total === 0) {
    return <Text style={styles.empty}>Bu maça henüz tahmin yapılmadı — ilk sen ol.</Text>;
  }

  const pct = (n: number) => Math.round((n / pulse.total) * 100);
  const homePct = pct(pulse.home);
  const drawPct = pct(pulse.draw);
  const awayPct = pct(pulse.away);

  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <IconPeople size={12} color={colors.inkDim} />
          <Text style={styles.headerText}>Topluluk Nabzı</Text>
        </View>
        <Text style={styles.headerText}>{pulse.total} tahmin</Text>
      </View>
      <View style={styles.track}>
        {homePct > 0 && <View style={{ width: `${homePct}%`, backgroundColor: colors.gold }} />}
        {drawPct > 0 && <View style={{ width: `${drawPct}%`, backgroundColor: colors.inkFaint }} />}
        {awayPct > 0 && <View style={{ width: `${awayPct}%`, backgroundColor: colors.green }} />}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendText}>1: {homePct}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.inkFaint }]} />
          <Text style={styles.legendText}>X: {drawPct}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
          <Text style={styles.legendText}>2: {awayPct}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { marginTop: 12, textAlign: "center", fontSize: 11, fontFamily: fonts.regular, color: colors.inkFaint },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { fontSize: 10, fontFamily: fonts.semibold, color: colors.inkDim, textTransform: "uppercase" },
  track: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.bgElevated },
  legendRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontFamily: fonts.regular, color: colors.inkDim },
});
