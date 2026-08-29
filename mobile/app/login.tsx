import { useState } from "react";
import {
  ActivityIndicator,
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo width={200} />
          <Text style={styles.subtitle}>Maç Günü Kontrol Odası&apos;na giriş yap.</Text>
        </View>

        <View style={styles.form}>
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
              placeholder="••••••••"
              placeholderTextColor={colors.inkFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
          </Pressable>
        </View>

        <SocialAuthButtons mode="login" />

        <Text style={styles.footer}>
          Hesabın yok mu?{" "}
          <Link href="/register" style={styles.link}>
            Kayıt ol
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
  subtitle: { color: colors.inkDim, fontSize: 14, fontFamily: fonts.regular, marginTop: 10, textAlign: "center" },
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
  button: { backgroundColor: colors.gold, borderRadius: radii.xl, paddingVertical: 13, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
  error: { color: colors.red, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.red}1A`, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { color: colors.inkDim, fontSize: 14, fontFamily: fonts.regular, textAlign: "center", marginTop: 20 },
  link: { color: colors.gold, fontFamily: fonts.semibold },
});
