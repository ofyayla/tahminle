import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { api, ApiError } from "@/lib/api";
import { formatMatchDate } from "@/lib/format";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { IconLogout } from "@/components/icons";

const TEAMS: TeamCode[] = ["GS", "FB", "BJK"];

export default function HesabimScreen() {
  const { user, rank, totalPlayers, refresh, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
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

  const chooseTeam = async (team: TeamCode) => {
    const next = user.favoriteTeam === team ? null : team;
    setSwitching(true);
    setError(null);
    try {
      await api.updateFavoriteTeam(next);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Takım güncellenemedi.");
    } finally {
      setSwitching(false);
    }
  };

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
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tuttuğun Takım</Text>
        <Text style={styles.sectionSub}>Maç Günü ekranın seçtiğin kulübe göre özelleşir.</Text>
        <View style={styles.teamRow}>
          {TEAMS.map((code) => {
            const m = TEAM_META[code];
            const active = user.favoriteTeam === code;
            return (
              <Pressable
                key={code}
                disabled={switching}
                onPress={() => chooseTeam(code)}
                style={[styles.teamCard, active && { borderColor: m.color, backgroundColor: `${m.color}1A` }]}
              >
                <View style={styles.teamLogo}>
                  <Image source={{ uri: m.logo }} style={{ width: 44, height: 44 }} />
                </View>
                <Text style={styles.teamShort}>{m.short}</Text>
              </Pressable>
            );
          })}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}

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
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, marginBottom: 4 },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginBottom: 12 },
  teamRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  teamCard: { flex: 1, alignItems: "center", gap: 8, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, padding: 12 },
  teamLogo: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  teamShort: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
  error: { color: colors.red, fontSize: 12, fontFamily: fonts.regular, textAlign: "center", marginTop: 8 },
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
