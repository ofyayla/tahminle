import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts } from "@/lib/theme";

// The one screen a friend-league invite link (tahminle://davet?code=...&ref=...)
// always lands on, signed in or not — declared outside both Stack.Protected
// blocks in _layout.tsx so it's reachable in either auth state. It has
// nothing of its own to show: it either joins the league right away (already
// signed in) or hands the invite off to the register screen to redeem at
// signup, then gets out of the way.
export default function DavetScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { code, ref } = useLocalSearchParams<{ code?: string; ref?: string }>();
  const [error, setError] = useState<string | null>(null);
  // StrictMode/fast-refresh can re-run this effect; a join call is not
  // idempotent-free of side effects worth repeating (though harmless if it
  // does — joinLeague itself tolerates a re-join), so guard it once anyway.
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || attempted.current) return;
    attempted.current = true;

    // Signed out: an invite hands off to the register screen to redeem at
    // signup; without one there's nothing here but a trip to login.
    if (!user) {
      router.replace(
        code
          ? { pathname: "/register", params: { invite: code, ref: ref ?? "" } }
          : "/login"
      );
      return;
    }

    // A signed-in account mid-onboarding (no club picked yet — the OAuth
    // path) has neither "/lig" nor the tabs mounted to land on, so "/" here
    // would REPLACE onto an unmounted "(tabs)" and strand the screen. Send it
    // to the one-time picker instead; the invite link stays valid, so tapping
    // it again after takim-sec works fine. This has to run before the "no
    // code" branch below, which also targets "/".
    if (user.favoriteTeam == null) {
      router.replace("/takim-sec");
      return;
    }

    // Signed in and onboarded but reached without an invite code (a stale
    // deep link, a restored dev navigation state) — nothing to redeem, so
    // get out of the way instead of spinning forever.
    if (!code) {
      router.replace("/");
      return;
    }

    api
      .joinLeague(code, ref ?? null)
      .then((res) => router.replace({ pathname: "/lig", params: { id: res.leagueId } }))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Bu davet linki artık geçerli değil.");
      });
  }, [loading, user, code, ref, router]);

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.errorTitle}>Olmadı</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Text style={styles.link} onPress={() => router.replace("/ligler")}>
              Ligleri gör
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.note}>Davet açılıyor…</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  note: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  errorTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  errorBody: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, textAlign: "center", lineHeight: 19 },
  link: { color: colors.gold, fontSize: 13, fontFamily: fonts.bold, marginTop: 8 },
});
