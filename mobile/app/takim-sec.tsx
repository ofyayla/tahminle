import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandLogo from "@/components/BrandLogo";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";

const TEAMS: TeamCode[] = ["GS", "FB", "BJK"];

// Shown once, to any signed-in account that has no club yet — which in
// practice means everyone who came in through Google/Apple, since those
// flows never touch the registration form. The choice is permanent (the
// backend's PATCH only accepts it while the column is still null), so the
// screen says so before asking.
export default function TakimSecScreen() {
  const { user, refresh } = useAuth();
  const [selected, setSelected] = useState<TeamCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.chooseTeam(selected);
      // Refreshing flips favoriteTeam on the context, which is what the root
      // layout's guard watches — the tabs mount as soon as it lands.
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Takım kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <BrandLogo width={180} />
          <Text style={styles.welcome}>
            {user?.displayName ? `Hoş geldin, ${user.displayName}!` : "Hoş geldin!"}
          </Text>
          <Text style={styles.title}>Kulübünü seç</Text>
          <Text style={styles.subtitle}>
            Maç Günü ekranın seçtiğin kulübe göre özelleşir. Bu seçim sonradan değiştirilemez.
          </Text>
        </View>

        <View style={styles.teamList}>
          {TEAMS.map((code) => {
            const meta = TEAM_META[code];
            const active = selected === code;
            return (
              <Pressable
                key={code}
                disabled={busy}
                onPress={() => setSelected(code)}
                style={[
                  styles.teamCard,
                  active && { borderColor: meta.color, backgroundColor: `${meta.color}1A` },
                ]}
              >
                <View style={styles.teamLogo}>
                  <Image source={{ uri: meta.logo }} style={{ width: 48, height: 48 }} />
                </View>
                <Text style={styles.teamName}>{meta.name}</Text>
                <View style={[styles.radio, active && { borderColor: meta.color }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: meta.color }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!selected || busy) && styles.buttonDisabled]}
          disabled={!selected || busy}
          onPress={confirm}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>{selected ? "Devam et" : "Bir kulüp seç"}</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>Gerçek para içermez · Tüm bakiyeler sanaldır.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 28 },
  welcome: { color: colors.gold, fontSize: 13, fontFamily: fonts.semibold, marginTop: 14 },
  title: { color: colors.ink, fontSize: 26, fontFamily: fonts.display, marginTop: 6 },
  subtitle: {
    color: colors.inkDim,
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  teamList: { gap: 10 },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
  },
  teamLogo: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  teamName: { flex: 1, color: colors.ink, fontSize: 16, fontFamily: fonts.bold },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radii.xl,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
  error: {
    color: colors.red,
    fontSize: 13,
    fontFamily: fonts.regular,
    backgroundColor: `${colors.red}1A`,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  disclaimer: {
    textAlign: "center",
    color: colors.inkFaint,
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 20,
  },
});
