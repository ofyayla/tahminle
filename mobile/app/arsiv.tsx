import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import FormChart from "@/components/FormChart";
import { api, ApiError } from "@/lib/api";
import type { SeasonChampionEntry, WeeklyChampionEntry, FormPoint } from "@/lib/api";
import { formatDateRange, formatTL } from "@/lib/format";
import { TEAM_META } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function ArsivScreen() {
  const router = useRouter();
  const [weekly, setWeekly] = useState<WeeklyChampionEntry[]>([]);
  const [season, setSeason] = useState<SeasonChampionEntry[]>([]);
  const [form, setForm] = useState<FormPoint[]>([]);
  const [titles, setTitles] = useState({ weeklyCount: 0, seasonCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getArchive();
      setWeekly(data.weeklyChampions);
      setSeason(data.seasonChampions);
      setForm(data.form);
      setTitles({ weeklyCount: data.myWeeklyTitles, seasonCount: data.mySeasonTitles });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Arşiv alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Taraftar Ligi</Text>
            <Text style={styles.title}>Sezon Arşivi</Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : (
          <>
            <View style={styles.formCard}>
              <Text style={styles.cardEyebrow}>Senin Formun</Text>
              <Text style={styles.cardSub}>Son {form.length} haftanın net kârı, bu hafta dahil.</Text>
              <FormChart points={form} />
              {(titles.weeklyCount > 0 || titles.seasonCount > 0) && (
                <View style={styles.titleRow}>
                  {titles.seasonCount > 0 && (
                    <View style={styles.titlePillGold}>
                      <Text style={styles.titlePillGoldText}>🏆 {titles.seasonCount} sezon birincisi</Text>
                    </View>
                  )}
                  {titles.weeklyCount > 0 && (
                    <View style={styles.titlePill}>
                      <Text style={styles.titlePillText}>🏆 {titles.weeklyCount} hafta birincisi</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Sezon Şampiyonları</Text>
            <Text style={styles.sectionSub}>Her sezonun net kâr lideri.</Text>
            {season.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>Henüz tamamlanan bir sezon yok.</Text>
              </View>
            ) : (
              <View style={{ gap: 8, marginBottom: 20 }}>
                {season.map((s) => {
                  const meta = s.favoriteTeam ? TEAM_META[s.favoriteTeam] : null;
                  const start = new Date(s.seasonStart);
                  return (
                    <View key={s.seasonStart} style={styles.seasonRow}>
                      <Text style={{ fontSize: 20 }}>🏆</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {s.displayName} {meta && <Text style={{ color: colors.inkDim }}>· {meta.name}</Text>}
                        </Text>
                        <Text style={styles.rowSub}>{formatDateRange(start, new Date(start.getTime() + 4 * WEEK_MS))}</Text>
                      </View>
                      <Text style={[styles.rowNet, { color: s.net >= 0 ? colors.green : colors.red }]}>
                        {s.net >= 0 ? "+" : "−"}
                        {formatTL(Math.abs(s.net))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Hafta Birincileri</Text>
            <Text style={styles.sectionSub}>Son {weekly.length} haftanın şampiyonları.</Text>
            {weekly.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>Henüz taçlanan bir hafta yok — Salı 09:00&apos;da ilk şampiyon belli olacak.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {weekly.map((w) => {
                  const meta = w.favoriteTeam ? TEAM_META[w.favoriteTeam] : null;
                  const start = new Date(w.weekStart);
                  return (
                    <View key={w.weekStart} style={styles.weeklyRow}>
                      <View style={styles.weeklyAvatar}>
                        {meta ? (
                          <Image source={{ uri: meta.logo }} style={{ width: 36, height: 36 }} />
                        ) : (
                          <Text style={styles.avatarText}>{w.displayName.slice(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{w.displayName}</Text>
                        <Text style={styles.rowSub}>{formatDateRange(start, new Date(start.getTime() + WEEK_MS))}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.rowNet, { color: w.net >= 0 ? colors.green : colors.red }]}>
                          {w.net >= 0 ? "+" : "−"}
                          {formatTL(Math.abs(w.net))}
                        </Text>
                        <Text style={styles.rowBonus}>+{formatTL(w.bonus)} prim</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 60 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.inkDim, fontSize: 22, lineHeight: 22, marginTop: -2 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 26, fontFamily: fonts.display, marginTop: 2 },
  formCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16, marginBottom: 20 },
  cardEyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase" },
  cardSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.inkDim, marginTop: 2, marginBottom: 12 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  titlePillGold: { borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillGoldText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 11 },
  titlePill: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, marginBottom: 2 },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginBottom: 12 },
  emptyCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 20, marginBottom: 20 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  seasonRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii["2xl"], borderWidth: 1, borderColor: `${colors.gold}4D`, backgroundColor: `${colors.gold}0D`, padding: 14 },
  weeklyRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 14 },
  weeklyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 11 },
  rowName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  rowSub: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  rowNet: { fontFamily: fonts.display, fontSize: 13 },
  rowBonus: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.regular, marginTop: 2 },
});
