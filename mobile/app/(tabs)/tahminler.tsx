import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PredictionCard from "@/components/PredictionCard";
import { IconShield, IconTrendUpArrow } from "@/components/icons";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { formatTL } from "@/lib/format";
import type { PredictionDTO } from "@/lib/predictionTypes";
import { colors, fonts, radii } from "@/lib/theme";

export default function TahminlerScreen() {
  const [open, setOpen] = useState<PredictionDTO[]>([]);
  const [settled, setSettled] = useState<PredictionDTO[]>([]);
  const [stats, setStats] = useState({ total: 0, correct: 0, netEffect: 0 });
  const [tab, setTab] = useState<"open" | "settled">("open");

  const load = useCallback(async () => {
    const data = await api.getPredictions();
    setOpen(data.open);
    setSettled(data.settled);
    setStats(data.stats);
  }, []);

  const { loading, refreshing, error, refresh } = useScreenLoad(load);

  const list = tab === "open" ? open : settled;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <ErrorBanner message={error} />
            <Text style={styles.eyebrow}>Sanal Performans</Text>
            <Text style={styles.title}>Tahminler</Text>
            <Text style={styles.pageSub}>Maç günündeki seçimlerini takip et, sonuçlarını birlikte değerlendir.</Text>

            <View style={styles.statsCard}>
              <View style={styles.statsHeaderRow}>
                <View>
                  <Text style={styles.statsEyebrow}>Son 30 Gün</Text>
                  <Text style={styles.statsTitle}>Sanal oyun performansın</Text>
                </View>
                <View style={styles.statsIconWrap}>
                  <IconTrendUpArrow size={16} color={colors.gold} />
                </View>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>tahmin</Text>
                </View>
                <View style={[styles.statCol, styles.statColDivider]}>
                  <Text style={[styles.statValue, { color: colors.green }]}>{stats.correct}</Text>
                  <Text style={styles.statLabel}>doğru</Text>
                </View>
                <View style={[styles.statCol, styles.statColDivider]}>
                  <Text style={[styles.statValue, { color: stats.netEffect >= 0 ? colors.gold : colors.red }]}>
                    {stats.netEffect >= 0 ? "+" : ""}
                    {formatTL(stats.netEffect)}
                  </Text>
                  <Text style={styles.statLabel}>net sanal etki</Text>
                </View>
              </View>
              <View style={styles.statsDisclaimer}>
                <IconShield size={14} color={colors.green} />
                <Text style={styles.statsDisclaimerText}>Gerçek para içermez · Tüm bakiyeler sanaldır.</Text>
              </View>
            </View>

            <View style={styles.tabRow}>
              <Pressable style={[styles.tabBtn, tab === "open" && styles.tabBtnActive]} onPress={() => setTab("open")}>
                <Text style={[styles.tabText, tab === "open" && styles.tabTextActive]}>Açık {open.length}</Text>
              </Pressable>
              <Pressable style={[styles.tabBtn, tab === "settled" && styles.tabBtnActive]} onPress={() => setTab("settled")}>
                <Text style={[styles.tabText, tab === "settled" && styles.tabTextActive]}>
                  Sonuçlanan {settled.length}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.listTitle}>{tab === "open" ? "Açık tahminin" : "Sonuçlanan tahminlerin"}</Text>
            <Text style={styles.listSub}>
              {tab === "open" ? "Kilitleyip maç sonucunu beklediğin seçim." : "Kapanmış maçlardaki performansın."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <PredictionCard prediction={item} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.empty}>
                {tab === "open" ? "Şu an açık bir tahminin yok." : "Henüz sonuçlanan tahminin yok."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 130 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, marginTop: 6 },
  pageSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 8, marginBottom: 16 },
  statsCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16, marginBottom: 16 },
  statsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statsEyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase" },
  statsTitle: { fontSize: 17, fontFamily: fonts.display, color: colors.ink, marginTop: 2 },
  statsIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row" },
  statCol: { flex: 1, alignItems: "center" },
  statColDivider: { borderLeftWidth: 1, borderLeftColor: colors.cardBorder },
  statValue: { fontSize: 20, fontFamily: fonts.display, color: colors.ink },
  statLabel: { fontSize: 10, fontFamily: fonts.regular, color: colors.inkDim, marginTop: 2 },
  statsDisclaimer: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bgElevated, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  statsDisclaimerText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular },
  tabRow: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, padding: 4, gap: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.xl, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.gold },
  tabText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 13 },
  tabTextActive: { color: colors.bg },
  listTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  listSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 2, marginBottom: 12 },
  emptyCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 24 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
});
