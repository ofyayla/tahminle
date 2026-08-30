import { useEffect, useState } from "react";
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

// Owns the launch splash. It renders BootSplash — visually identical to the
// native splash — until everything the first screen needs is ready, then
// swaps in the navigator and tells the OS to fade its splash away.
function AppGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, loading } = useAuth();

  // Only a signed-in account with a club lands on Maç Günü; everyone else
  // (signed out, or still on the club picker) has nothing to warm, so the
  // splash lifts as soon as the session is known.
  const landsOnMatchday = !loading && !!user && user.favoriteTeam != null;
  const [warmed, setWarmed] = useState(false);

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

  const ready = fontsLoaded && !loading && (warmed || !landsOnMatchday);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <BootSplash />;
  return <RootNavigator />;
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
