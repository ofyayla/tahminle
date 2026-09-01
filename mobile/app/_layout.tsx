import { useCallback, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useFonts as useArchivoBlack, ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import {
  useFonts as useManrope,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { prefetchMatchday } from "@/lib/matchday";
import { routeForNotification } from "@/lib/push";
import { colors } from "@/lib/theme";
import BootSplash from "@/components/BootSplash";

// Keep the OS splash up past the JS bundle load — we hide it ourselves once
// fonts, the session, and the first Maç Günü payload are all in (AppGate).
// Guarded: if the native module isn't in this binary yet (added but not
// rebuilt), expo-router's own auto-hide still runs and BootSplash covers the
// gap.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

// A slow or offline network must never strand anyone on the splash — after
// this long we drop into the app and let the screen show its own retry.
const WARM_TIMEOUT_MS = 4000;
// The splash always holds at least this long (from first JS render) so a fast
// cold start doesn't flash by, then plays the zoom-through hand-off over
// SPLASH_EXIT_MS.
const SPLASH_MIN_MS = 1500;
const SPLASH_EXIT_MS = 520;

export default function RootLayout() {
  const [archivoLoaded] = useArchivoBlack({ ArchivoBlack_400Regular });
  const [manropeLoaded] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppGate fontsLoaded={archivoLoaded && manropeLoaded} />
    </AuthProvider>
  );
}

// Owns the launch splash. BootSplash (the gold wordmark on the same field as
// the native splash) sits on top of the navigator until everything the first
// screen needs is ready AND the minimum hold has passed, then plays its
// zoom-through hand-off to reveal the app.
function AppGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, loading } = useAuth();

  // Only a signed-in account with a club lands on Maç Günü; everyone else
  // (signed out, or still on the club picker) has nothing to warm, so the
  // splash lifts as soon as the session is known.
  const landsOnMatchday = !loading && !!user && user.favoriteTeam != null;
  const [warmed, setWarmed] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  // 0 while the splash holds, animated to 1 to play the zoom-through exit.
  const [exit] = useState(() => new Animated.Value(0));

  // Minimum on-screen time.
  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Warm the first Maç Günü payload while the splash holds.
  useEffect(() => {
    if (!landsOnMatchday) return;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setWarmed(true);
    };
    // Cap the wait so a slow or offline network can't strand anyone on the
    // splash — the screen shows its own retry from there.
    const timer = setTimeout(finish, WARM_TIMEOUT_MS);
    prefetchMatchday()
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [landsOnMatchday]);

  const contentReady = fontsLoaded && !loading && (warmed || !landsOnMatchday);
  const revealApp = contentReady && minElapsed;

  // Hand the native splash (same #0a0d16 field) over to BootSplash the moment
  // JS is up, so the only animated transition the user sees is BootSplash -> app.
  const handOffNativeSplash = useCallback(() => {
    setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 3500);
  }, []);

  // Play the zoom-through hand-off once the app behind it is ready and the
  // minimum hold has passed: BootSplash rushes the wordmark up through the
  // screen while this layer's field dissolves over the last stretch.
  useEffect(() => {
    if (!revealApp) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: SPLASH_EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSplashGone(true);
    });
  }, [revealApp, exit]);

  return (
    <View style={styles.root}>
      {contentReady && <RootNavigator />}
      {!splashGone && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: exit.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }) },
          ]}
          pointerEvents={revealApp ? "none" : "auto"}
        >
          <BootSplash onLayout={handOffNativeSplash} exit={exit} />
        </Animated.View>
      )}
    </View>
  );
}

function RootNavigator() {
  const { user } = useAuth();
  useNotificationRouting(!!user);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* A friend-league invite link (tahminle://davet?code=...&ref=...) can
          land here whether or not anyone's signed in yet — unlike every
          other screen below, it isn't behind a Stack.Protected guard, so
          it's always part of the navigator to redirect from. */}
      <Stack.Screen name="davet" />
      {/* A signed-in account with no club can't use the app meaningfully —
          Maç Günü is built around one — and can no longer set it from
          Hesabım, so it goes through the one-time picker first. In practice
          this is the Google/Apple path, which never sees the sign-up form. */}
      <Stack.Protected guard={!!user && user.favoriteTeam == null}>
        <Stack.Screen name="takim-sec" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && user.favoriteTeam != null}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bildirimler" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="ligler" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="lig" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="arsiv" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="akis" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="hareketler" options={{ animation: "slide_from_right" }} />
        {/* The wallet's two irreversible flows. A modal owns the keyboard and
            can be dismissed outright, which an accordion inside the scrolling
            tab could not. */}
        <Stack.Screen name="gonder" options={{ presentation: "modal" }} />
        <Stack.Screen name="hediye" options={{ presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

// Sends the user to the screen a tapped notification is about. Handles both
// the app being opened by the notification from cold (getLastNotificationResponse)
// and a tap while it's already running (the subscription).
function useNotificationRouting(signedIn: boolean) {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    // Routing into the tabs before the session is confirmed would just bounce
    // off the auth guard.
    if (!signedIn) return;
    const data = lastResponse?.notification.request.content.data;
    const route = routeForNotification(data);
    if (route) router.push(route as never);
  }, [signedIn, lastResponse, router]);
}
