import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MatchCard from "@/components/MatchCard";
import MatchRowCompact from "@/components/MatchRowCompact";
import StakeModal from "@/components/StakeModal";
import BrandLogo from "@/components/BrandLogo";
import ErrorBanner from "@/components/ErrorBanner";
import { IconBell, IconChevronDown, IconPeople, IconTrendBars, IconWallet } from "@/components/icons";
import InviteFriendsCard from "@/components/InviteFriendsCard";
import { api } from "@/lib/api";
import { peekMatchday, prefetchMatchday } from "@/lib/matchday";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { countUnread, getNotificationsSeenAt } from "@/lib/notificationsSeen";
import { getOddsFor, type MarketCode } from "@/lib/markets";
import { formatTL, formatTime } from "@/lib/format";
import type { MatchDTO } from "@/lib/types";
import type { MyLeague } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { useAuth } from "@/lib/auth-context";

export default function MacGunuScreen() {
  const { user, rank, totalPlayers } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Seeded from the boot-splash prefetch when it's still fresh, so the hero
  // and match list paint on the first frame instead of flashing a spinner.
  // load() below still runs to refresh and to pull in the non-critical extras.
  const [matches, setMatches] = useState<MatchDTO[]>(() => peekMatchday()?.matches ?? []);
  const [available, setAvailable] = useState(() => peekMatchday()?.available ?? 0);
  const [wallet, setWallet] = useState(
    () => peekMatchday()?.wallet ?? { openCount: 0, lockedInOpen: 0, potentialReturn: 0, total: 0 }
  );
  const [unread, setUnread] = useState(0);
  const [myLeagues, setMyLeagues] = useState<MyLeague[]>([]);
  // The "Arkadaşlarını Davet Et" teaser below the hero starts collapsed —
  // tapping it reveals InviteFriendsCard's representative ranking visual in
  // place, rather than navigating away immediately.
  const [inviteOpen, setInviteOpen] = useState(false);
  // Which of the compact rows the user has opened. The featured match is
  // always expanded, so it never appears here.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selection, setSelection] = useState<{ match: MatchDTO; market: MarketCode; choice: string } | null>(null);

  const load = useCallback(async () => {
    const snap = await prefetchMatchday();
    setMatches(snap.matches);
    setAvailable(snap.available);
    setWallet(snap.wallet);

    // Same treatment as the notification badge below: a nicety, never a
    // reason to take the whole screen down.
    try {
      const leaguesData = await api.getMyLeagues();
      setMyLeagues(leaguesData.leagues);
    } catch {
      setMyLeagues([]);
    }

    // The badge is a nicety — a failure here must not take the screen down.
    try {
      const [notifications, seenAt] = await Promise.all([
        api.getNotifications(),
        getNotificationsSeenAt(),
      ]);
      setUnread(countUnread(notifications.items, seenAt));
    } catch {
      setUnread(0);
    }
  }, []);

  const { loading, refreshing, error, refresh, reload } = useScreenLoad(load);

  const favMeta = user?.favoriteTeam ? TEAM_META[user.favoriteTeam as TeamCode] : null;

  return (
    <View style={styles.flex}>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={error} />
            <View style={[styles.hero, favMeta && { borderColor: `${favMeta.color}66` }]}>
              {favMeta ? (
                <>
                  <Image source={{ uri: favMeta.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.78)", colors.bg]}
                    style={StyleSheet.absoluteFill}
                  />
                </>
              ) : (
                <LinearGradient colors={["#1a2440", "#111830", "#0a0d16"]} style={StyleSheet.absoluteFill} />
              )}

              <View style={styles.heroTop}>
                <BrandLogo width={110} />
                <Pressable
                  style={styles.bellBtn}
                  onPress={() => router.push("/bildirimler")}
                  hitSlop={8}
                >
                  <IconBell size={20} color={unread > 0 ? colors.gold : colors.inkDim} />
                  {unread > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {favMeta && (
                <View style={styles.favLogoWrap}>
                  <Image source={{ uri: favMeta.logo }} style={{ width: 56, height: 56 }} />
                </View>
              )}

              <Text style={[styles.eyebrow, favMeta && { marginTop: 12 }]}>
                {favMeta ? `${favMeta.name} Kontrol Odası` : "Maç Günü Kontrol Odası"}
              </Text>
              <Text style={styles.heroTitle}>Bu hafta sahne senin.</Text>

              <View style={styles.statRow}>
                <View style={styles.statChip}>
                  <View style={styles.statIconWrap}>
                    <IconWallet size={16} color={colors.gold} />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Sanal Bakiye</Text>
                    <Text style={styles.statValueGold}>{formatTL(available)}</Text>
                  </View>
                </View>
                <View style={styles.statChip}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${colors.green}33` }]}>
                    <IconTrendBars size={16} color={colors.green} />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Sıralama</Text>
                    <Text style={styles.statValue}>
                      #{rank ?? "-"} <Text style={styles.statValueSub}>/ {totalPlayers}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.inviteTeaser}>
              <Pressable style={styles.inviteTeaserHeader} onPress={() => setInviteOpen((o) => !o)}>
                <View style={styles.inviteTeaserIconWrap}>
                  <IconPeople size={16} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteTeaserTitle}>Arkadaşlarını Davet Et</Text>
                  <Text style={styles.inviteTeaserNote}>
                    {myLeagues.length > 0
                      ? "Katılan her arkadaşınla ikinize de ₺100 bonus."
                      : "Kendi ligini kur, katılan her arkadaşınla ikinize de ₺100 bonus."}
                  </Text>
                </View>
                <View style={inviteOpen ? { transform: [{ rotate: "180deg" }] } : undefined}>
                  <IconChevronDown size={16} color={colors.inkDim} />
                </View>
              </Pressable>
              {inviteOpen && (
                <View style={styles.inviteTeaserBody}>
                  <InviteFriendsCard league={myLeagues[0] ?? null} referralCode={user?.referralCode} />
                </View>
              )}
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <View>
                  <Text style={styles.statusEyebrow}>Bugünkü Durum</Text>
                  <Text style={styles.statusTitle}>Tahminlerin sahada</Text>
                </View>
                <View style={styles.statusIconWrap}>
                  <IconTrendBars size={16} color={colors.gold} />
                </View>
              </View>
              <View style={styles.statusGrid}>
                <View style={styles.statusCol}>
                  <Text style={styles.statusValue}>{wallet.openCount}</Text>
                  <Text style={styles.statusColLabel}>açık tahmin</Text>
                </View>
                <View style={[styles.statusCol, styles.statusColDivider]}>
                  <Text style={[styles.statusValue, { color: colors.red }]}>{formatTL(wallet.lockedInOpen)}</Text>
                  <Text style={styles.statusColLabel}>riskte</Text>
                </View>
                <View style={[styles.statusCol, styles.statusColDivider]}>
                  <Text style={[styles.statusValue, { color: colors.green }]}>{formatTL(wallet.potentialReturn)}</Text>
                  <Text style={styles.statusColLabel}>potansiyel getiri</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Sıradaki Maçlar</Text>
              <Text style={styles.sectionCount}>{matches.length} maç</Text>
            </View>
            <Text style={styles.sectionSub}>Kulübünün maçını seç, sanal tahminini kur.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const onPick = (market: MarketCode, choice: string) =>
            setSelection({ match: item, market, choice });

          // The next match up gets the full treatment; everything behind it
          // is a compact row that expands on tap, so the list stays scannable.
          if (index === 0) {
            return (
              <View style={styles.cardWrap}>
                <MatchCard match={item} featured onPick={onPick} />
              </View>
            );
          }

          const isOpen = !!expanded[item.id];
          return (
            <View style={styles.cardWrap}>
              <MatchRowCompact
                match={item}
                expanded={isOpen}
                onToggle={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
              />
              {isOpen && (
                <View style={{ marginTop: 8 }}>
                  <MatchCard match={item} onPick={onPick} />
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.empty}>Şu anda yaklaşan maç bulunamadı.</Text>
            </View>
          )
        }
        ListFooterComponent={
          matches.length > 0 ? (
            <View style={styles.footerPill}>
              <View style={styles.footerDot} />
              <Text style={styles.footerText}>Veri güncellendi: {formatTime(new Date())}</Text>
            </View>
          ) : null
        }
      />

      {selection && (
        <StakeModal
          match={selection.match}
          market={selection.market}
          choice={selection.choice}
          odds={
            getOddsFor(
              { ...selection.match, ...selection.match.extraOdds },
              selection.market,
              selection.choice
            ) ?? 0
          }
          available={available}
          onClose={() => setSelection(null)}
          onSuccess={async () => {
            setSelection(null);
            await reload();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 120, gap: 12 },
  hero: { borderRadius: radii["3xl"], borderWidth: 1, borderColor: colors.cardBorder, padding: 20, overflow: "hidden", marginBottom: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  favLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  bellBadgeText: { color: "#fff", fontSize: 10, fontFamily: fonts.bold },
  eyebrow: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2, marginTop: 20 },
  heroTitle: { color: colors.ink, fontSize: 30, fontFamily: fonts.display, marginTop: 4 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  statChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 16, paddingVertical: 12 },
  statIconWrap: { width: 32, height: 32, borderRadius: radii.lg, backgroundColor: `${colors.gold}33`, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 10, fontFamily: fonts.semibold, color: colors.inkDim, textTransform: "uppercase" },
  statValueGold: { fontSize: 17, fontFamily: fonts.display, color: colors.gold, marginTop: 2 },
  statValue: { fontSize: 17, fontFamily: fonts.display, color: colors.ink, marginTop: 2 },
  statValueSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.inkDim },
  inviteTeaser: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
    backgroundColor: `${colors.gold}0D`,
    marginBottom: 20,
    overflow: "hidden",
  },
  inviteTeaserHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  inviteTeaserIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${colors.gold}26`, alignItems: "center", justifyContent: "center" },
  inviteTeaserTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  inviteTeaserNote: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 3, lineHeight: 15 },
  inviteTeaserBody: { borderTopWidth: 1, borderTopColor: `${colors.gold}26`, padding: 14 },
  statusCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16, marginBottom: 20 },
  statusHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusEyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase" },
  statusTitle: { fontSize: 17, fontFamily: fonts.display, color: colors.ink, marginTop: 2 },
  statusIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  statusGrid: { flexDirection: "row" },
  statusCol: { flex: 1, paddingRight: 8 },
  statusColDivider: { borderLeftWidth: 1, borderLeftColor: colors.cardBorder, paddingLeft: 8 },
  statusValue: { fontSize: 22, fontFamily: fonts.display, color: colors.ink },
  statusColLabel: { fontSize: 11, fontFamily: fonts.regular, color: colors.inkDim, marginTop: 2 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.display },
  sectionCount: { color: colors.inkFaint, fontSize: 12, fontFamily: fonts.semibold },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4, marginBottom: 12 },
  cardWrap: { marginBottom: 12 },
  emptyCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 24 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  footerPill: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  footerText: { fontSize: 11, fontFamily: fonts.semibold, color: colors.inkDim },
});
