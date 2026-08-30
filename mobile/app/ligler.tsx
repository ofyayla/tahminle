import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import { IconArrowRight } from "@/components/icons";
import { api, ApiError, type MyLeague } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

export default function LiglerScreen() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyLeagues();
      setLeagues(data.leagues);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ligler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function createLeague() {
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError("Lig adı en az 2 karakter olmalı.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.createLeague(name);
      router.push({ pathname: "/lig", params: { id: res.leagueId } });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Lig oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function joinLeague() {
    setFormError(null);
    if (code.trim().length === 0) {
      setFormError("Davet kodu girmelisin.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.joinLeague(code);
      router.push({ pathname: "/lig", params: { id: res.leagueId } });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Lige katılamadın.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Taraftar Ligi</Text>
            <Text style={styles.title}>Arkadaş Ligleri</Text>
          </View>
        </View>
        <Text style={styles.pageSub}>Davet kodunla arkadaşlarınla özel bir sıralama kur — aynı net kâr hesabı, sadece aranızda.</Text>

        <ErrorBanner message={error} />

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : leagues.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>Henüz bir lige katılmadın.</Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {leagues.map((l) => (
              <Pressable
                key={l.id}
                style={styles.leagueRow}
                onPress={() => router.push({ pathname: "/lig", params: { id: l.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.leagueName}>{l.name}</Text>
                  <Text style={styles.leagueSub}>
                    {l.memberCount} üye{l.isOwner ? " · Sahibi sensin" : ""}
                  </Text>
                </View>
                <IconArrowRight size={16} color={colors.inkFaint} />
              </Pressable>
            ))}
          </View>
        )}

        {mode === null ? (
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={() => setMode("create")}>
              <Text style={styles.actionBtnText}>+ Lig Oluştur</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setMode("join")}>
              <Text style={styles.actionBtnText}>Lige Katıl</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>{mode === "create" ? "Yeni Lig" : "Davet Koduyla Katıl"}</Text>
              <Pressable onPress={() => setMode(null)} hitSlop={8}>
                <Text style={styles.formClose}>×</Text>
              </Pressable>
            </View>
            {mode === "create" ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Örn. Mahalle Ligi"
                placeholderTextColor={colors.inkFaint}
                maxLength={40}
              />
            ) : (
              <TextInput
                style={[styles.input, { textTransform: "uppercase" }]}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="Örn. AB12CD"
                placeholderTextColor={colors.inkFaint}
                maxLength={20}
                autoCapitalize="characters"
              />
            )}
            {formError && <Text style={styles.formError}>{formError}</Text>}
            <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={mode === "create" ? createLeague : joinLeague} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.submitText}>{mode === "create" ? "Oluştur" : "Katıl"}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 60 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.inkDim, fontSize: 22, lineHeight: 22, marginTop: -2 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 26, fontFamily: fonts.display, marginTop: 2 },
  pageSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginBottom: 16 },
  emptyCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 24, marginBottom: 20 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  leagueRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  leagueName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  leagueSub: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 3 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingVertical: 14, alignItems: "center" },
  actionBtnText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  formCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  formHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  formTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  formClose: { color: colors.inkDim, fontSize: 22, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.semibold,
    marginBottom: 12,
  },
  formError: { color: colors.red, fontSize: 12, fontFamily: fonts.regular, marginBottom: 10 },
  submit: { backgroundColor: colors.gold, borderRadius: radii.xl, paddingVertical: 13, alignItems: "center" },
  submitText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
});
