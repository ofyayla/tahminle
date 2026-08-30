import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { formatMatchDate } from "@/lib/format";
import { TEAM_META } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { IconLogout } from "@/components/icons";

export default function HesabimScreen() {
  const { user, rank, totalPlayers, refresh, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState({ weeklyCount: 0, seasonCount: 0 });

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        refresh(),
        api
          .getArchive()
          .then((a) => setTitles({ weeklyCount: a.myWeeklyTitles, seasonCount: a.mySeasonTitles }))
          .catch(() => {}),
      ]).finally(() => setLoading(false));
    }, [refresh])
  );

  if (loading || !user) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const meta = user.favoriteTeam ? TEAM_META[user.favoriteTeam] : null;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.eyebrow}>Hesap Kontrolü</Text>
        <Text style={styles.title}>Hesabım</Text>

        <View style={[styles.profileCard, meta && { borderColor: `${meta.color}66` }]}>
          {meta && (
            <>
              <Image source={{ uri: meta.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.82)", colors.bg]}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}
          <View style={styles.profileContent}>
            <View style={[styles.avatar, !meta && styles.avatarFallback]}>
              {meta ? (
                <Image source={{ uri: meta.logo }} style={{ width: 80, height: 80 }} />
              ) : (
                <Text style={styles.avatarText}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.profileName}>{user.displayName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            {rank != null && (
              <View style={styles.rankPill}>
                <Text style={styles.rankPillText}>
                  Sıralamada #{rank} · {totalPlayers} taraftar arasında
                </Text>
              </View>
            )}
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
        </View>

        <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kullanıcı adı</Text>
            <Text style={styles.infoValue}>{user.displayName}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>E-posta</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Tuttuğun takım</Text>
            <Text style={styles.infoValue}>{meta?.name ?? "Seçilmedi"}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Üyelik başlangıcı</Text>
            <Text style={styles.infoValue}>{formatMatchDate(new Date(user.createdAt))}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Başlangıç bakiyesi</Text>
            <Text style={styles.infoValue}>₺{user.startBalance.toLocaleString("tr-TR")}</Text>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <IconLogout size={16} color={colors.red} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>

        <Text style={styles.disclaimer}>Gerçek para içermez · Tüm bakiyeler ve sonuçlar sanaldır.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 130 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, marginTop: 6, marginBottom: 16 },
  profileCard: { borderRadius: radii["3xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: "hidden", marginBottom: 20 },
  profileContent: { alignItems: "center", padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 12 },
  avatarFallback: { borderWidth: 2, borderColor: colors.inkFaint, backgroundColor: colors.bgElevated },
  avatarText: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 18 },
  profileName: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  profileEmail: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4 },
  rankPill: { marginTop: 12, borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 6 },
  rankPillText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 12 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  titlePillGold: { borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillGoldText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 11 },
  titlePill: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, marginBottom: 4 },
  infoCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, marginTop: 20, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  infoDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  infoLabel: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  infoValue: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.red}4D`,
    backgroundColor: `${colors.red}1A`,
    paddingVertical: 14,
    marginBottom: 20,
  },
  logoutText: { color: colors.red, fontFamily: fonts.bold, fontSize: 14 },
  disclaimer: { textAlign: "center", color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular },
});
