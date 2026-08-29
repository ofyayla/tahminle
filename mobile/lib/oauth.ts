import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Device from "expo-device";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Finishes the browser session on the redirect back into the app. Must run
// once at module scope, before any auth request is made.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = "google" | "apple";

// Google issues a separate client id per platform. All three go in app.json's
// `extra`, and the backend accepts any of them as a valid audience — see
// GOOGLE_OAUTH_CLIENT_IDS in ../../lib/oauth.ts.
type GoogleClientIds = { ios?: string; android?: string; web?: string };

function googleClientIds(): GoogleClientIds {
  return (Constants.expoConfig?.extra?.googleOAuth ?? {}) as GoogleClientIds;
}

export function isGoogleConfigured(): boolean {
  const ids = googleClientIds();
  return !!(ids.ios || ids.android || ids.web);
}

// Sign in with Apple is iOS-only, and needs the entitlement that only a real
// build carries — it is not available in Expo Go.
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// Thrown when a provider's credentials haven't been filled in yet, so the UI
// can say exactly that instead of surfacing a raw provider error.
export class NotConfiguredError extends Error {}

// Running inside the Expo Go client rather than our own build.
//
// This matters because both providers key off the app's real bundle
// identifier, which Expo Go doesn't have — it reports `host.exp.Exponent`.
// Google therefore receives a redirect_uri that isn't registered for our
// client and answers with a bare "Erişim engellendi / invalid_request" page,
// which tells the user nothing. Catching it here means we can explain the
// actual situation instead of handing them that dead end.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const EXPO_GO_MESSAGE =
  "Expo Go'da sosyal giriş çalışmaz: sağlayıcılar uygulamanın kendi paket kimliğini ister, Expo Go ise kendi kimliğiyle açılır. Development build ile dene — e-posta/şifre girişi burada da çalışıyor.";

// `useIdTokenAuthRequest` throws during render if the current platform's
// client id is undefined — which would take the whole login screen down
// before the user could read anything. Feeding it a placeholder keeps the
// hook alive so the button can report the real problem on tap instead.
const PLACEHOLDER_CLIENT_ID = "unconfigured.apps.googleusercontent.com";

// How long to wait for the code->token exchange after a successful redirect.
const TOKEN_EXCHANGE_TIMEOUT_MS = 20000;

// Hook form, because expo-auth-session's Google provider needs to own a
// redirect listener for the lifetime of the screen.
//
// The awkward part: on native, `promptAsync()` resolves with an authorization
// code, NOT an id_token. The provider then exchanges that code for tokens
// inside its own effect and publishes the result through the hook's second
// return value, a render later. So the token has to be picked up from
// `response` — reading it off promptAsync's return would always come back
// empty and fail every sign-in.
export function useGoogleAuth() {
  const ids = googleClientIds();
  const ready = isGoogleConfigured();

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: ids.ios || PLACEHOLDER_CLIENT_ID,
    androidClientId: ids.android || PLACEHOLDER_CLIENT_ID,
    clientId: ids.web || PLACEHOLDER_CLIENT_ID,
    // The backend verifies the ID token's signature and audience, so that is
    // the only thing worth asking for here.
    scopes: ["openid", "email", "profile"],
  });

  // The promise handed back to the caller, parked until the exchange lands.
  const pending = useRef<{
    resolve: (v: { idToken: string } | null) => void;
    reject: (e: Error) => void;
  } | null>(null);

  useEffect(() => {
    if (!pending.current || !response) return;

    if (response.type === "success") {
      const idToken =
        (response.params?.id_token as string | undefined) || response.authentication?.idToken;
      // The first `response` after a redirect still only holds the code —
      // the exchange hasn't finished. Keep waiting rather than failing.
      if (!idToken) return;

      pending.current.resolve({ idToken });
      pending.current = null;
      return;
    }

    if (response.type === "error") {
      pending.current.reject(new Error("Google girişi tamamlanamadı."));
    } else {
      // cancel / dismiss — an ordinary outcome, not an error.
      pending.current.resolve(null);
    }
    pending.current = null;
  }, [response]);

  const promptGoogle = async (): Promise<{ idToken: string } | null> => {
    if (isExpoGo) throw new NotConfiguredError(EXPO_GO_MESSAGE);
    if (!ready) {
      throw new NotConfiguredError(
        "Google girişi henüz yapılandırılmadı. app.json içindeki extra.googleOAuth alanına client ID'leri ekle."
      );
    }

    const settled = new Promise<{ idToken: string } | null>((resolve, reject) => {
      pending.current = { resolve, reject };
    });

    const result = await promptAsync();
    // Backing out never reaches the exchange, so resolve here instead of
    // leaving the promise parked until it times out.
    if (result.type !== "success") {
      pending.current = null;
      return null;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Google yanıt vermedi, tekrar dene.")),
        TOKEN_EXCHANGE_TIMEOUT_MS
      )
    );

    try {
      return await Promise.race([settled, timeout]);
    } finally {
      pending.current = null;
    }
  };

  return { ready, promptGoogle };
}

export type AppleResult = { idToken: string; fullName: string | null };

export async function signInWithApple(): Promise<AppleResult | null> {
  if (isExpoGo) throw new NotConfiguredError(EXPO_GO_MESSAGE);
  if (!(await isAppleAvailable())) {
    throw new NotConfiguredError(
      Platform.OS === "ios"
        ? "Apple ile giriş için development build gerekiyor — Expo Go bu yetkiyi taşımıyor."
        : "Apple ile giriş yalnızca iOS'ta kullanılabilir."
    );
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // NotConfiguredError rather than a plain Error: both of these are
    // environment problems the user can act on, and the UI shows this class's
    // message verbatim instead of replacing it with a generic one.
    if (!credential.identityToken) {
      throw new NotConfiguredError(
        Device.isDevice
          ? "Apple kimlik anahtarı alınamadı. Cihazın Ayarlar'da bir Apple Kimliği'yle oturum açmış olması gerekiyor."
          : "Simülatör Apple kimlik anahtarı vermedi. Apple ile giriş simülatörde güvenilir çalışmaz — gerçek cihazda dene."
      );
    }

    // Apple hands over the name exactly once — on the first authorisation —
    // and never again, not even in the token. Forward it now or lose it.
    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return { idToken: credential.identityToken, fullName: name || null };
  } catch (err) {
    const cancelled =
      typeof err === "object" && err && (err as { code?: string }).code === "ERR_REQUEST_CANCELED";

    if (cancelled) {
      // On a real device this is the user backing out of the sheet — an
      // ordinary outcome, so stay silent.
      if (Device.isDevice) return null;

      // On the simulator it usually isn't a cancel at all: Apple's sheet
      // accepts the password and then fails, reporting the same code. Left
      // as a silent null it looked exactly like nothing happening, which is
      // the worst possible feedback. Say what's going on instead.
      throw new NotConfiguredError(
        "Apple ile giriş simülatörde güvenilir çalışmıyor — şifreyi kabul edip sessizce iptal ediyor. Gerçek cihazda dene. (Simülatörde deneyeceksen Ayarlar'dan bir Apple Kimliği'yle oturum açmış olman gerekir.)"
      );
    }

    throw err;
  }
}

// Exposed for the "what redirect URI do I register?" question — logging this
// once during setup is far easier than deriving it by hand.
export function redirectUri(): string {
  return AuthSession.makeRedirectUri();
}
