import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";
import BrandLogo from "@/components/BrandLogo";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import { TEAM_META, type TeamCode } from "@/lib/teams";

const TEAM_CODES: TeamCode[] = ["GS", "FB", "BJK", "TS"];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState<TeamCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim(), favoriteTeam);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo width={200} />
          <Text style={styles.title}>HESAP AÇ</Text>
          <Text style={styles.subtitle}>₺1.000 sanal bakiye ile maç günü başlasın.</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Kullanıcı adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Taraftar123"
              placeholderTextColor={colors.inkFaint}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          <View>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@mail.com"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.inkFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View>
            <Text style={styles.label}>Tuttuğun takım</Text>
            <View style={styles.teamRow}>
              {TEAM_CODES.map((code) => {
                const meta = TEAM_META[code];
                const active = favoriteTeam === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setFavoriteTeam(active ? null : code)}
                    style={[styles.teamChip, active && styles.teamChipActive]}
                  >
                    <View style={styles.teamLogoWrap}>
                      <Image source={{ uri: meta.logo }} style={{ width: 32, height: 32 }} />
                    </View>
                    <Text style={[styles.teamChipText, active && { color: colors.gold }]}>{meta.short}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>Hesap Oluştur</Text>}
          </Pressable>
        </View>

        <SocialAuthButtons mode="register" />

        <Text style={styles.footer}>
          Zaten hesabın var mı?{" "}
          <Link href="/login" style={styles.link}>
            Giriş yap
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 32 },
  title: { color: colors.ink, fontSize: 22, fontFamily: fonts.display, marginTop: 10 },
  subtitle: { color: colors.inkDim, fontSize: 14, fontFamily: fonts.regular, marginTop: 8, textAlign: "center" },
  form: {
    gap: 16,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 20,
  },
  label: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.semibold, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  teamRow: { flexDirection: "row", gap: 8 },
  teamChip: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
  },
  teamChipActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  teamLogoWrap: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  teamChipText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 10 },
  button: { backgroundColor: colors.gold, borderRadius: radii.xl, paddingVertical: 13, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
  error: { color: colors.red, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.red}1A`, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { color: colors.inkDim, fontSize: 14, fontFamily: fonts.regular, textAlign: "center", marginTop: 20 },
  link: { color: colors.gold, fontFamily: fonts.semibold },
});
