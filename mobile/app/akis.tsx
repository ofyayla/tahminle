import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import { api, ApiError } from "@/lib/api";
import { getChoiceLabel, type MarketCode } from "@/lib/markets";
import { formatTL } from "@/lib/format";
import { TEAM_META } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";

type FeedItem = Awaited<ReturnType<typeof api.getCommunityFeed>>["feed"][number];

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}s önce`;
  return `${Math.floor(hours / 24)}g önce`;
}

export default function TopluluknAkisiScreen() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getCommunityFeed();
      setFeed(data.feed);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Akış alınamadı.");
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
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Taraftar Ligi</Text>
            <Text style={styles.title}>Topluluk Akışı</Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : feed.length === 0 ? (
          <Text style={styles.empty}>Henüz kimse tahmin yapmadı — ilk sen ol.</Text>
        ) : (
          <View style={styles.feedCard}>
            {feed.map((item, i) => {
              const meta = item.favoriteTeam ? TEAM_META[item.favoriteTeam] : null;
              const choiceText = getChoiceLabel(item, item.market as MarketCode, item.choice);
              return (
                <View key={item.id} style={[styles.feedRow, i > 0 && styles.feedDivider]}>
                  <View style={styles.feedAvatar}>
                    {meta ? (
                      <Image source={{ uri: meta.logo }} style={{ width: 28, height: 28 }} />
                    ) : (
                      <Text style={styles.avatarTextSm}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.feedHeadRow}>
                      <Text style={styles.feedName} numberOfLines={1}>
                        <Text style={{ fontFamily: fonts.bold }}>{item.displayName}</Text>
                        {item.isYou && <Text style={{ color: colors.gold }}> (Sen)</Text>}
                        <Text style={styles.feedChoiceInline}> · {choiceText}</Text>
                      </Text>
                      <Text style={styles.feedTime}>{timeAgo(item.at)}</Text>
                    </View>
                    <View style={styles.feedBottomRow}>
                      <Text style={styles.feedMatch} numberOfLines={1}>
                        {item.homeTeam} – {item.awayTeam}
                      </Text>
                      <Text style={styles.feedStake}>{formatTL(item.stake)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginVertical: 12 },
  feedCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  feedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  feedDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  feedAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarTextSm: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 9 },
  feedHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  feedName: { flex: 1, fontSize: 13, color: colors.ink },
  feedChoiceInline: { fontFamily: fonts.regular, color: colors.inkDim },
  feedMatch: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.inkFaint },
  feedTime: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.regular },
  feedBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 1 },
  feedStake: { color: colors.ink, fontFamily: fonts.display, fontSize: 12 },
});
