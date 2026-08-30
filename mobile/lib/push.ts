import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";
import { colors } from "./theme";

// How a notification behaves when it lands while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// The EAS project id, which getExpoPushTokenAsync requires. It comes from
// app.json's extra.eas.projectId once `eas init` has been run — until then
// there's no project to mint tokens against and registration is skipped
// rather than throwing on every launch.
function projectId(): string | null {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

async function getToken(): Promise<string | null> {
  // A simulator has no push service to register with — only a real device can
  // produce a token.
  if (!Device.isDevice) return null;

  const id = projectId();
  if (!id) {
    console.warn(
      "EAS projectId yok — bildirim kaydı atlandı. `eas init` çalıştırıp app.json'a extra.eas.projectId ekle."
    );
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Tahminle",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.gold,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data;
  } catch (err) {
    console.warn("Expo push token alınamadı:", err);
    return null;
  }
}

// Remembered so logout can tell the backend exactly which token to drop —
// re-deriving it there would re-prompt for permission on some platforms.
let registeredToken: string | null = null;

// Called after login and on cold start. Silent on failure: notifications are
// an extra, never a reason to block someone from using the app.
export async function registerForPush(): Promise<void> {
  try {
    const token = await getToken();
    if (!token) return;
    await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    registeredToken = token;
  } catch (err) {
    console.warn("Bildirim kaydı başarısız:", err);
  }
}

export async function unregisterFromPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await api.unregisterPushToken(registeredToken);
  } catch {
    // The session may already be gone (that's usually why we're logging out) —
    // the backend drops stale tokens on its own when Expo rejects them.
  } finally {
    registeredToken = null;
  }
}

// Where a tapped notification should take the user. Mirrors the `data.type`
// values lib/push.ts sends from the backend.
export function routeForNotification(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const type = (data as { type?: string }).type;
  switch (type) {
    case "goal":
    case "starting_soon":
      return "/(tabs)";
    case "settled":
      return "/(tabs)/tahminler";
    case "gift":
    case "transfer":
      return "/(tabs)/cuzdan";
    case "league_joined":
      return "/ligler";
    default:
      return null;
  }
}
