import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MatchCard from "@/components/MatchCard";
import StakeModal from "@/components/StakeModal";
import BrandLogo from "@/components/BrandLogo";
import { IconBell, IconTrendBars, IconWallet } from "@/components/icons";
import { api } from "@/lib/api";
import { getOddsFor, type MarketCode } from "@/lib/markets";
import { formatTL, formatTime } from "@/lib/format";
import type { MatchDTO } from "@/lib/types";
import { colors, fonts, radii } from "@/lib/theme";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { useAuth } from "@/lib/auth-context";

export default function MacGunuScreen() {
  const { user, rank, totalPlayers } = useAuth();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState({ openCount: 0, lockedInOpen: 0, potentialReturn: 0, total: 0 });
  const [selection, setSelection] = useState<{ match: MatchDTO; market: MarketCode; choice: string } | null>(null);

  const load = useCallback(async () => {
    const [matchesData, walletData] = await Promise.all([api.getMatches(), api.getWallet()]);
    setMatches(matchesData.matches);
    setAvailable(matchesData.available);
    setWallet(walletData.wallet);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const favMeta = user?.favoriteTeam ? TEAM_META[user.favoriteTeam as TeamCode] : null;

  return (
    <View style={styles.flex}>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
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
                {favMeta ? (
                  <View style={styles.favLogoWrap}>
                    <Image source={{ uri: favMeta.logo }} style={{ width: 64, height: 64 }} />
                  </View>
                ) : (
                  <View style={styles.noTeamBadge}>
                    <IconBell size={20} color={colors.inkDim} />
                  </View>
                )}
              </View>

              <Text style={styles.eyebrow}>{favMeta ? `${favMeta.name} Kontrol Odası` : "Maç Günü Kontrol Odası"}</Text>
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
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <MatchCard
              match={item}
              featured={index === 0}
              onPick={(market, choice) => setSelection({ match: item, market, choice })}
            />
          </View>
        )}
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
            await load();
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
  favLogoWrap: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  noTeamBadge: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2, marginTop: 20 },
  heroTitle: { color: colors.ink, fontSize: 30, fontFamily: fonts.display, marginTop: 4 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  statChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 16, paddingVertical: 12 },
  statIconWrap: { width: 32, height: 32, borderRadius: radii.lg, backgroundColor: `${colors.gold}33`, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 10, fontFamily: fonts.semibold, color: colors.inkDim, textTransform: "uppercase" },
  statValueGold: { fontSize: 17, fontFamily: fonts.display, color: colors.gold, marginTop: 2 },
  statValue: { fontSize: 17, fontFamily: fonts.display, color: colors.ink, marginTop: 2 },
  statValueSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.inkDim },
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
