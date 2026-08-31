import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoAccordion from "@/components/InfoAccordion";
import ErrorBanner from "@/components/ErrorBanner";
import InviteFriendsCard from "@/components/InviteFriendsCard";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import { api, type LeagueDetail, type MyLeague } from "@/lib/api";
import type { LeaderboardRow, LeaderboardScope } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { formatCountdown, formatDateRange, formatTL } from "@/lib/format";
import { PER_MATCH_CAP, WEEKLY_BUDGET } from "@/lib/season";
import { getChoiceLabel, type MarketCode } from "@/lib/markets";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import { IconArrowRight } from "@/components/icons";

type LeaderboardData = Awaited<ReturnType<typeof api.getLeaderboard>>;

const MEDAL = ["🥇", "🥈", "🥉"];
const FILTERS: { code: TeamCode | "ALL"; label: string }[] = [
  { code: "ALL", label: "Tümü" },
  { code: "GS", label: "GS" },
  { code: "FB", label: "FB" },
  { code: "BJK", label: "BJK" },
  { code: "TS", label: "TS" },
];
const SCOPES: { key: "week" | "season"; label: string }[] = [
  { key: "week", label: "Bu Hafta" },
  { key: "season", label: "Sezon" },
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

function NetAmount({ net, style }: { net: number; style: object }) {
  const color = net >= 0 ? colors.green : colors.red;
  return (
    <Text style={[style, { color }]}>
      {net >= 0 ? "+" : "−"}
      {formatTL(Math.abs(net))}
    </Text>
  );
}

export default function SiralamaScreen() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [scope, setScope] = useState<"week" | "season">("week");
  const [filter, setFilter] = useState<TeamCode | "ALL">("ALL");
  // Re-render once a minute so the countdown label stays fresh without a
  // pull-to-refresh — matters most in the final day, when it ticks by hour.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Arkadaşlarım/Herkes: which board this screen shows. Friend leagues used
  // to be a small 👥 card buried under the global board — this makes the
  // choice itself the screen's top-level control instead, on equal footing
  // with Herkes. `null` means "not decided yet" (myLeagues hasn't loaded),
  // resolved once by the effect below rather than re-defaulted on every
  // refresh, so a manual switch to Herkes never gets stomped by a pull-to-refresh.
  const [mode, setMode] = useState<"friends" | "global" | null>(null);
  const [myLeagues, setMyLeagues] = useState<MyLeague[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetail | null>(null);
  // The id a fetch attempt most recently failed for. "loading" is derived
  // below from whether leagueDetail actually matches activeLeagueId yet,
  // rather than a boolean flipped inside the effect — setting state
  // synchronously at the top of an effect body forces an extra render
  // before the fetch even starts.
  const [leagueDetailErrorFor, setLeagueDetailErrorFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [res, leaguesRes] = await Promise.all([api.getLeaderboard(), api.getMyLeagues()]);
    setData(res);
    setMyLeagues(leaguesRes.leagues);
  }, []);

  const { loading, refreshing, error, refresh } = useScreenLoad(load);

  const modeDecided = useRef(false);
  useEffect(() => {
    if (modeDecided.current || loading) return;
    modeDecided.current = true;
    setMode(myLeagues.length > 0 ? "friends" : "global");
    setActiveLeagueId(myLeagues[0]?.id ?? null);
  }, [loading, myLeagues]);

  useEffect(() => {
    if (mode !== "friends" || !activeLeagueId) return;
    let cancelled = false;
    api
      .getLeagueDetail(activeLeagueId)
      .then((res) => {
        if (!cancelled) setLeagueDetail(res.league);
      })
      .catch(() => {
        if (!cancelled) setLeagueDetailErrorFor(activeLeagueId);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, activeLeagueId]);

  const leagueDetailFailed = activeLeagueId != null && leagueDetailErrorFor === activeLeagueId;

  const active: LeaderboardScope | null = data ? data[scope] : null;

  const visible = useMemo(() => {
    if (!active) return [];
    return filter === "ALL" ? active.ranked : active.ranked.filter((r) => r.favoriteTeam === filter);
  }, [active, filter]);

  const emptyRowLabel = scope === "week" ? "Bu hafta henüz tahmin yok" : "Bu sezon henüz tahmin yok";

  // On a failed load `data` stays null, so falling through to the spinner
  // would leave the screen spinning forever with nothing to act on.
  if (loading || !data || !active) {
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

  const showGlobalBoard = mode === "global" || mode === null;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <FlatList
        data={showGlobalBoard ? visible : []}
        keyExtractor={(r: LeaderboardRow) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={error} />
            <Text style={styles.eyebrow}>Taraftar Ligi</Text>
            <Text style={styles.title}>Sıralama</Text>
            <Text style={styles.pageSub}>
              Net kârına göre sıralanıyorsun. Bakiyen ne kadar büyük olursa olsun herkesin kasası aynı.
            </Text>

            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeChip, mode === "friends" && styles.modeChipActive]}
                onPress={() => setMode("friends")}
              >
                <Text style={{ fontSize: 15 }}>👥</Text>
                <Text style={[styles.modeText, mode === "friends" && styles.modeTextActive]}>Arkadaşlarım</Text>
              </Pressable>
              <Pressable
                style={[styles.modeChip, mode === "global" && styles.modeChipActive]}
                onPress={() => setMode("global")}
              >
                <Text style={{ fontSize: 15 }}>🌍</Text>
                <Text style={[styles.modeText, mode === "global" && styles.modeTextActive]}>Herkes</Text>
              </Pressable>
            </View>
            <Pressable style={styles.archiveLink} onPress={() => router.push("/arsiv")} hitSlop={6}>
              <Text style={{ fontSize: 13 }}>🏆</Text>
              <Text style={styles.archiveLinkText}>Sezon Arşivi</Text>
              <IconArrowRight size={12} color={colors.inkFaint} />
            </Pressable>

            {mode === "friends" ? (
              myLeagues.length === 0 ? (
                <View style={{ marginTop: 16 }}>
                  <InviteFriendsCard />
                </View>
              ) : (
                <View style={{ marginTop: 16 }}>
                  {myLeagues.length > 1 && (
                    <View style={styles.leaguePickerRow}>
                      {myLeagues.map((l) => (
                        <Pressable
                          key={l.id}
                          onPress={() => setActiveLeagueId(l.id)}
                          style={[styles.leagueChip, activeLeagueId === l.id && styles.leagueChipActive]}
                        >
                          <Text
                            style={[styles.leagueChipText, activeLeagueId === l.id && styles.leagueChipTextActive]}
                            numberOfLines={1}
                          >
                            {l.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {leagueDetailFailed ? (
                    <Text style={styles.empty}>Lig alınamadı, tekrar dener misin?</Text>
                  ) : !leagueDetail || leagueDetail.id !== activeLeagueId ? (
                    <ActivityIndicator color={colors.gold} style={{ marginVertical: 30 }} />
                  ) : (
                    <>
                      <LeaderboardBoard week={leagueDetail.week} season={leagueDetail.season} />
                      <Pressable
                        style={styles.manageLink}
                        onPress={() => router.push({ pathname: "/lig", params: { id: leagueDetail.id } })}
                      >
                        <Text style={styles.manageLinkText}>Ligi yönet ve arkadaş davet et</Text>
                        <IconArrowRight size={12} color={colors.gold} />
                      </Pressable>
                    </>
                  )}
                </View>
              )
            ) : (
              <>
                <View style={styles.scopeRow}>
                  {SCOPES.map((s) => (
                    <Pressable
                      key={s.key}
                      onPress={() => setScope(s.key)}
                      style={[styles.scopeChip, scope === s.key && styles.scopeChipActive]}
                    >
                      <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {active.you && (
                  <View style={styles.youCard}>
                    <View style={styles.youTopRow}>
                      <View>
                        <Text style={styles.youLabel}>Senin Sıran</Text>
                        <Text style={styles.youRank}>#{active.you.rank}</Text>
                        <Text style={styles.youTotal}>{active.totalPlayers} taraftar arasında</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <NetAmount net={active.you.net} style={styles.youNet} />
                        <Text style={styles.youTotal}>net kâr</Text>
                        <Text style={styles.youTotal}>
                          {active.you.total > 0
                            ? `${active.you.correct}/${active.you.total} · %${active.you.accuracy}`
                            : "tahmin yok"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.seasonNote}>
                      <Text style={styles.seasonNoteText}>
                        {formatDateRange(new Date(active.rangeStart), new Date(active.rangeEnd))}
                      </Text>
                      <Text style={styles.seasonNoteStrong}>
                        {formatCountdown(new Date(active.rangeEnd), new Date(now))}
                      </Text>
                    </View>
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
              </>
            )}
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
                    : emptyRowLabel}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <NetAmount net={item.net} style={styles.rowBalance} />
                <Text style={styles.rowBalanceLabel}>net kâr</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          showGlobalBoard ? <Text style={styles.empty}>Bu filtrede henüz taraftar yok.</Text> : null
        }
        ListFooterComponent={
          !showGlobalBoard ? (
            <View style={{ height: 40 }} />
          ) : (
            <View style={{ marginTop: 8 }}>
              <View style={{ marginBottom: 20 }}>
                <InfoAccordion title="Sıralama nasıl hesaplanır?" subtitle="Haftalık kasa ve net kâr" defaultOpen={false}>
                  Sıralamanın birimi puan değil, lira — kazandığın tutar eksi yatırdığın tutar. Bir maç
                  haftasında kendi tahminlerine yatırabileceğin toplam tutar ₺{WEEKLY_BUDGET} ile, tek bir
                  maça yatırabileceğin tutar ise ₺{PER_MATCH_CAP} ile sınırlı — bu yüzden yüksek bakiye
                  sıralamada avantaj sağlamaz, herkes aynı kasayla oynar. Hediye edilen sürpriz kuponlar
                  seçimi sana ait olmadığı için sıralamaya girmez. Haftalık sıralama her Salı
                  sıfırlanır; sezonluk sıralama son 4 haftanın toplamıdır ve sezon sonunda sıfırlanır.
                </InfoAccordion>
              </View>

              <View style={styles.feedHeaderRow}>
                <Text style={styles.sectionTitle}>Topluluk Akışı</Text>
                <Pressable onPress={() => router.push("/akis")} hitSlop={8}>
                  <Text style={styles.viewAllText}>Tümünü gör</Text>
                </Pressable>
              </View>
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
            </View>
          )
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
  // Arkadaşlarım/Herkes: a segmented control, not two chips among many —
  // this is the screen's primary choice now, so it's sized and weighted
  // like one (bigger targets, filled active state) rather than matching the
  // smaller scope/filter chips below it.
  modeRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 14,
  },
  modeChipActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  modeText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 13 },
  modeTextActive: { color: colors.gold },
  archiveLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: 14 },
  archiveLinkText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 12 },
  leaguePickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  leagueChip: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 180 },
  leagueChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  leagueChipText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  leagueChipTextActive: { color: colors.bg },
  manageLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  manageLinkText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 12 },
  scopeRow: { flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 16 },
  scopeChip: {
    flex: 1,
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 10,
  },
  scopeChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  scopeText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  scopeTextActive: { color: colors.bg },
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
  youNet: { fontSize: 24, fontFamily: fonts.display },
  youTotal: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  seasonNote: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${colors.gold}33`,
    paddingTop: 12,
  },
  seasonNoteText: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular },
  seasonNoteStrong: { color: colors.ink, fontSize: 11, fontFamily: fonts.bold },
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
  rowBalance: { fontFamily: fonts.display, fontSize: 13 },
  rowBalanceLabel: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.regular, marginTop: 2 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginVertical: 12 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.display, marginTop: 8 },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4, marginBottom: 12 },
  feedHeaderRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 },
  viewAllText: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold },
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
