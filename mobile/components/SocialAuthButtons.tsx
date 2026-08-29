import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { NotConfiguredError, signInWithApple, useGoogleAuth } from "@/lib/oauth";
import { colors, fonts, radii } from "@/lib/theme";

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 34.9 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </Svg>
  );
}

function AppleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        fill={colors.ink}
        d="M16.4 12.8c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.2-3.8zM14.1 5.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
      />
    </Svg>
  );
}

// Google + Apple buttons for the login and register screens.
//
// Both are always visible. An earlier version hid a provider until it was
// configured, which meant the buttons simply never appeared during setup with
// nothing on screen explaining why. Now a tap on an unconfigured provider
// says what is missing (NotConfiguredError from lib/oauth), which is the
// message that actually helps.
//
// Apple is the one exception: it is genuinely iOS-only here, so on Android
// there is nothing to offer and the button is left out.
export default function SocialAuthButtons({ mode }: { mode: "login" | "register" }) {
  const { loginWithOAuth } = useAuth();
  const { promptGoogle } = useGoogleAuth();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showApple = Platform.OS === "ios";
  const verb = mode === "login" ? "Giriş yap" : "Kayıt ol";

  // A NotConfiguredError already carries the actionable text; anything else
  // gets a generic message so a provider's internals don't leak into the UI.
  function describe(err: unknown, fallback: string): string {
    if (err instanceof NotConfiguredError || err instanceof ApiError) return err.message;
    return fallback;
  }

  async function withGoogle() {
    setError(null);
    setBusy("google");
    try {
      const result = await promptGoogle();
      if (!result) return; // user dismissed the sheet
      await loginWithOAuth("google", result.idToken);
    } catch (err) {
      setError(describe(err, "Google ile giriş yapılamadı."));
    } finally {
      setBusy(null);
    }
  }

  async function withApple() {
    setError(null);
    setBusy("apple");
    try {
      const result = await signInWithApple();
      if (!result) return; // user cancelled
      await loginWithOAuth("apple", result.idToken, result.fullName);
    } catch (err) {
      setError(describe(err, "Apple ile giriş yapılamadı."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.line} />
      </View>

      {showApple && (
        <Pressable
          style={[styles.button, styles.appleButton, busy !== null && styles.disabled]}
          disabled={busy !== null}
          onPress={withApple}
        >
          {busy === "apple" ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <AppleMark />
              <Text style={styles.appleText}>Apple ile {verb}</Text>
            </>
          )}
        </Pressable>
      )}

      <Pressable
        style={[styles.button, styles.googleButton, busy !== null && styles.disabled]}
        disabled={busy !== null}
        onPress={withGoogle}
      >
        {busy === "google" ? (
          <ActivityIndicator color="#1f1f1f" />
        ) : (
          <>
            <GoogleMark />
            <Text style={styles.googleText}>Google ile {verb}</Text>
          </>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 20 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  line: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  dividerText: { color: colors.inkFaint, fontSize: 12, fontFamily: fonts.regular },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: radii.xl,
    paddingVertical: 13,
    borderWidth: 1,
  },
  appleButton: { backgroundColor: colors.bgElevated, borderColor: colors.cardBorder },
  appleText: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold },
  googleButton: { backgroundColor: "#fff", borderColor: "#fff" },
  googleText: { color: "#1f1f1f", fontSize: 14, fontFamily: fonts.bold },
  disabled: { opacity: 0.6 },
  error: {
    color: colors.red,
    fontSize: 13,
    fontFamily: fonts.regular,
    backgroundColor: `${colors.red}1A`,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
});
