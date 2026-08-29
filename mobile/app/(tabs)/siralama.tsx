import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoAccordion from "@/components/InfoAccordion";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { formatMatchDate, formatTL } from "@/lib/format";
import { getChoiceLabel, type MarketCode } from "@/lib/markets";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";

type LeaderboardData = Awaited<ReturnType<typeof api.getLeaderboard>>;

const MEDAL = ["🥇", "🥈", "🥉"];
const FILTERS: { code: TeamCode | "ALL"; label: string }[] = [
  { code: "ALL", label: "Tümü" },
  { code: "GS", label: "GS" },
  { code: "FB", label: "FB" },
  { code: "BJK", label: "BJK" },
];

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}s önce`;
  return `${Math.floor(hours / 24)}g önce`;
}

export default function SiralamaScreen() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [filter, setFilter] = useState<TeamCode | "ALL">("ALL");

  const load = useCallback(async () => {
    const res = await api.getLeaderboard();
    setData(res);
  }, []);

  const { loading, refreshing, error, refresh } = useScreenLoad(load);

  const visible = useMemo(() => {
    if (!data) return [];
    return filter === "ALL" ? data.ranked : data.ranked.filter((r) => r.favoriteTeam === filter);
  }, [data, filter]);

  // The season closes at Monday 00:00, i.e. the very start of the next week —
  // label it with the Sunday that's actually the last playing day. Guarded
  // because a backend that predates weekly seasons sends no seasonEnd at all,
  // and formatMatchDate throws outright on an invalid Date.
  const seasonLastDay = useMemo(() => {
    const end = data?.seasonEnd ? new Date(data.seasonEnd) : null;
    if (!end || Number.isNaN(end.getTime())) return null;
    return new Date(end.getTime() - 1);
  }, [data?.seasonEnd]);

  // On a failed load `data` stays null, so falling through to the spinner
  // would leave the screen spinning forever with nothing to act on.
  if (loading || !data) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
        ) : (
          <View style={{ padding: 16 }}>
            <ErrorBanner message={error ?? "Veri alınamadı."} />
            <Pressable style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={error} />
            <Text style={styles.eyebrow}>Taraftar Ligi</Text>
            <Text style={styles.title}>Sıralama</Text>
            <Text style={styles.pageSub}>
              Bu haftanın doğru tahmin puanlarına göre sıralanıyorsun. Bakiye değil, isabet konuşuyor.
            </Text>

            {data.you && (
              <View style={styles.youCard}>
                <View style={styles.youTopRow}>
                  <View>
                    <Text style={styles.youLabel}>Senin Sıran</Text>
                    <Text style={styles.youRank}>#{data.you.rank}</Text>
                    <Text style={styles.youTotal}>{data.totalPlayers} taraftar arasında</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.youPoints}>{data.you.points}</Text>
                    <Text style={styles.youTotal}>puan</Text>
                    <Text style={styles.youTotal}>
                      {data.you.total > 0
                        ? `${data.you.correct}/${data.you.total} · %${data.you.accuracy}`
                        : "tahmin yok"}
                    </Text>
                  </View>
                </View>
                {seasonLastDay && (
                  <Text style={styles.seasonNote}>
                    Sezon {formatMatchDate(seasonLastDay)} akşamı kapanıyor, Pazartesi sıfırlanır.
                  </Text>
                )}
              </View>
            )}

            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.code}
                  onPress={() => setFilter(f.code)}
                  style={[styles.filterChip, filter === f.code && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, filter === f.code && styles.filterTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = item.favoriteTeam ? TEAM_META[item.favoriteTeam] : null;
          return (
            <View style={[styles.row, item.isYou && styles.rowYou]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{item.rank <= 3 ? MEDAL[item.rank - 1] : `#${item.rank}`}</Text>
              </View>
              <View style={styles.avatar}>
                {meta ? (
                  <Image source={{ uri: meta.logo }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={styles.avatarText}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.displayName} {item.isYou && <Text style={{ color: colors.gold }}>(Sen)</Text>}
                </Text>
                <Text style={styles.rowTeam}>
                  {item.total > 0
                    ? `${item.correct}/${item.total} doğru · %${item.accuracy} isabet`
                    : "Bu hafta henüz tahmin yok"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.rowBalance}>{item.points}</Text>
                <Text style={styles.rowBalanceLabel}>puan</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Bu filtrede henüz taraftar yok.</Text>}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <View style={{ marginBottom: 20 }}>
              <InfoAccordion title="Puanlar nasıl hesaplanır?" subtitle="Haftalık sezon ve isabet puanı" defaultOpen={false}>
                Doğru bilinen her tahmin, kilitlenen oranın 10 katı kadar puan kazandırır — 2.40
                oranlı bir tahmin 24 puan eder. Yanlış tahmin puan kaybettirmez, sadece isabet
                yüzdeni düşürür. Ne kadar sanal bakiye yatırdığın puanı etkilemez, bu yüzden yüksek
                bakiye sıralamada avantaj sağlamaz. Tek bir tahminden en fazla 100 puan alınabilir.
                Hediye edilen sürpriz kuponlar seçimi sana ait olmadığı için sıralamaya girmez.
                Sezon her Pazartesi 00:00'da sıfırlanır.
              </InfoAccordion>
            </View>

            <Text style={styles.sectionTitle}>Topluluk Akışı</Text>
            <Text style={styles.sectionSub}>Grubun içindeki taraftarlar hangi maça ne oynadı.</Text>
            {data.feed.length === 0 ? (
              <Text style={styles.empty}>Henüz kimse tahmin yapmadı — ilk sen ol.</Text>
            ) : (
              <View style={styles.feedCard}>
                {data.feed.map((item, i) => {
                  const meta = item.favoriteTeam ? TEAM_META[item.favoriteTeam] : null;
                  const choiceText = getChoiceLabel(item, item.market as MarketCode, item.choice);
                  return (
                    <View key={item.id} style={[styles.feedRow, i > 0 && styles.feedDivider]}>
                      <View style={styles.feedAvatar}>
                        {meta ? (
                          <Image source={{ uri: meta.logo }} style={{ width: 32, height: 32 }} />
                        ) : (
                          <Text style={styles.avatarTextSm}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.feedHeadRow}>
                          <Text style={styles.feedName} numberOfLines={1}>
                            {item.displayName} {item.isYou && <Text style={{ color: colors.gold }}>(Sen)</Text>}
                          </Text>
                          <Text style={styles.feedTime}>{timeAgo(item.at)}</Text>
                        </View>
                        <Text style={styles.feedMatch} numberOfLines={1}>
                          {item.homeTeam} – {item.awayTeam}
                        </Text>
                        <View style={styles.feedBottomRow}>
                          <View style={styles.feedChip}>
                            <Text style={styles.feedChipText}>{choiceText}</Text>
                          </View>
                          <Text style={styles.feedStake}>{formatTL(item.stake)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  retryBtn: {
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 12,
  },
  retryText: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 130 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, marginTop: 6 },
  pageSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 8, marginBottom: 16 },
  youCard: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    backgroundColor: `${colors.gold}1A`,
    padding: 16,
    marginBottom: 16,
  },
  youTopRow: { flexDirection: "row", justifyContent: "space-between" },
  youLabel: { color: colors.goldDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  youRank: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, marginTop: 2 },
  youPoints: { color: colors.gold, fontSize: 24, fontFamily: fonts.display },
  youTotal: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  seasonNote: {
    color: colors.inkDim,
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${colors.gold}33`,
    paddingTop: 12,
  },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterChip: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  filterChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  filterTextActive: { color: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 14, marginBottom: 8 },
  rowYou: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  rankText: { color: colors.ink, fontFamily: fonts.display, fontSize: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 11 },
  rowName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  rowTeam: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  rowBalance: { color: colors.gold, fontFamily: fonts.display, fontSize: 13 },
  rowBalanceLabel: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.regular, marginTop: 2 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginVertical: 12 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.display, marginTop: 8 },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4, marginBottom: 12 },
  feedCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  feedRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  feedDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  feedAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarTextSm: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 10 },
  feedHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  feedName: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: colors.ink },
  feedMatch: { fontSize: 13, fontFamily: fonts.regular, color: colors.inkDim, marginTop: 2 },
  feedTime: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular },
  feedBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 },
  feedChip: { backgroundColor: `${colors.gold}26`, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  feedChipText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 11 },
  feedStake: { color: colors.ink, fontFamily: fonts.display, fontSize: 13 },
});
