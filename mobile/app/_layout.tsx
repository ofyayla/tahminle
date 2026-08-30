import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, View } from "react-native";
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
import { routeForNotification } from "@/lib/push";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const [archivoLoaded] = useArchivoBlack({ ArchivoBlack_400Regular });
  const [manropeLoaded] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!archivoLoaded || !manropeLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  useNotificationRouting(!!user);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
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
