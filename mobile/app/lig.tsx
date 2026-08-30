import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import LeagueAdminPanel from "@/components/LeagueAdminPanel";
import { IconShare, IconWhatsapp } from "@/components/icons";
import { api, ApiError, type LeagueDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatTL } from "@/lib/format";
import { inviteLink, inviteMessage } from "@/lib/referral";
import { colors, fonts, radii } from "@/lib/theme";

export default function LigDetayScreen() {
  const router = useRouter();
  const { user } = useAuth();
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

  async function shareInvite() {
    if (!league) return;
    const link = inviteLink(league.inviteCode, user?.referralCode);
    try {
      await Share.share({ message: inviteMessage(league.name, link) });
    } catch {
      // The share sheet itself failing (dismissed mid-render, odd OS state)
      // isn't worth surfacing — the user just tries again.
    }
  }

  async function shareToWhatsapp() {
    if (!league) return;
    const link = inviteLink(league.inviteCode, user?.referralCode);
    const text = encodeURIComponent(inviteMessage(league.name, link));
    try {
      // No canOpenURL check first — that needs an iOS Info.plist entry
      // (LSApplicationQueriesSchemes) that would mean a new native build.
      // openURL alone needs no such entry: it just rejects if nothing can
      // handle the scheme, which the catch below falls back from.
      await Linking.openURL(`whatsapp://send?text=${text}`);
    } catch {
      await shareInvite();
    }
  }

  async function shareWeeklyTable() {
    if (!league) return;
    const link = inviteLink(league.inviteCode, user?.referralCode);
    const lines = league.week.ranked
      .slice(0, 8)
      .map((r, i) => `${i + 1}. ${r.displayName}${r.isYou ? " (Sen)" : ""} — ${r.net >= 0 ? "+" : "−"}${formatTL(Math.abs(r.net))}`);
    const message = `🏆 ${league.name} — Bu Haftanın Tablosu\n\n${lines.join("\n")}\n\nSen de katıl: ${link}`;
    try {
      await Share.share({ message });
    } catch {
      // Same as shareInvite — a dismissed sheet needs no error surfaced.
    }
  }

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
                <Text style={styles.codeHint}>davet kodu</Text>
              </View>
            </View>

            <View style={styles.inviteCard}>
              <Text style={styles.inviteTitle}>Ligini büyüt</Text>
              <Text style={styles.inviteNote}>
                Kişisel linkinle katılan arkadaşına <Text style={{ fontFamily: fonts.bold, color: colors.gold }}>ikinize de ₺100 bonus</Text>.
              </Text>
              <View style={styles.inviteBtnRow}>
                <Pressable style={styles.whatsappBtn} onPress={shareToWhatsapp}>
                  <IconWhatsapp size={16} color={colors.bg} />
                  <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                </Pressable>
                <Pressable style={styles.shareBtn} onPress={shareInvite}>
                  <IconShare size={16} color={colors.gold} />
                  <Text style={styles.shareBtnText}>Paylaş</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <LeaderboardBoard week={league.week} season={league.season} />
            </View>

            <Pressable style={styles.weeklyShareBtn} onPress={shareWeeklyTable}>
              <IconShare size={13} color={colors.inkDim} />
              <Text style={styles.weeklyShareText}>Bu haftanın tablosunu paylaş</Text>
            </Pressable>

            <View style={{ height: 16 }} />

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
  inviteCard: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.gold}59`,
    backgroundColor: `${colors.gold}0D`,
    padding: 16,
    marginBottom: 16,
  },
  inviteTitle: { color: colors.ink, fontSize: 15, fontFamily: fonts.display },
  inviteNote: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular, marginTop: 4, lineHeight: 17 },
  inviteBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  whatsappBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#25D366",
    borderRadius: radii.xl,
    paddingVertical: 12,
  },
  whatsappBtnText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 13 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    backgroundColor: `${colors.gold}1A`,
    borderRadius: radii.xl,
    paddingVertical: 12,
  },
  shareBtnText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 13 },
  weeklyShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingVertical: 12,
  },
  weeklyShareText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 12 },
});
