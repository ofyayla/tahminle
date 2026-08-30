import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import LeagueAdminPanel from "@/components/LeagueAdminPanel";
import { api, ApiError, type LeagueDetail } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

export default function LigDetayScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getLeagueDetail(id);
      setLeague(data.league);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lig alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [id]);

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
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Arkadaş Ligi</Text>
            <Text style={styles.title} numberOfLines={1}>
              {league?.name ?? "Lig"}
            </Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : !league ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>Bu lig bulunamadı ya da üyesi değilsin.</Text>
          </View>
        ) : (
          <>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{league.memberCount}</Text> üye
                {league.isOwner ? " · Sahibi sensin" : ""}
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText} selectable>
                  {league.inviteCode}
                </Text>
                <Text style={styles.codeHint}>uzun bas, kopyala</Text>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <LeaderboardBoard week={league.week} season={league.season} />
            </View>

            <LeagueAdminPanel
              league={league}
              onLeft={() => router.replace("/ligler")}
              onDeleted={() => router.replace("/ligler")}
              onChanged={load}
            />
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
  title: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, marginTop: 2 },
  emptyCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 24 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 16,
  },
  metaText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  codeBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    backgroundColor: `${colors.gold}1A`,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  codeText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2 },
  codeHint: { color: colors.goldDim, fontSize: 9, fontFamily: fonts.regular, marginTop: 2 },
});
