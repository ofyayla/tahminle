# Tahminle — Mobile (Expo)

Native iOS/Android client for the [Tahminle](../) web app, built with Expo Router.
It talks to the same Next.js backend (`../app/api/*`) over HTTP — no separate backend to run.

## Setup

```bash
cp .env.example .env.local
# edit EXPO_PUBLIC_API_BASE_URL to point at your deployed backend
npm install
npm start
```

Then press `i` for the iOS Simulator, `a` for Android, or scan the QR code
with Expo Go on a physical device.

## How it talks to the backend

- Auth uses `Authorization: Bearer <token>` instead of the web app's session
  cookie (see `lib/api.ts`, `lib/auth-context.tsx`). The token is stored with
  `expo-secure-store` and returned by `/api/auth/login` and `/api/auth/register`.
- Data endpoints live in `../app/api/{matches,wallet,predictions,leaderboard,account,transfers,gifts}`.
- Team logos/banners are loaded from the deployed backend's `/public` assets
  (`lib/teams.ts` builds URLs from `EXPO_PUBLIC_API_BASE_URL`), so no images
  are duplicated into this project.

## Google / Apple sign-in

Mobile only — the web login stays password-only. The buttons hide themselves
when a provider isn't configured, so nothing breaks before setup is done.

The identity token is always verified **on the server** (`../lib/oauth.ts`)
against Google's and Apple's public keys, checking both the signature and that
the token was issued to *our* app. A token the client merely claims is valid
is worthless; a forged one is rejected.

### Setup

**Google** — Cloud Console → APIs & Services → Credentials. Create an OAuth
client ID for each platform you ship (iOS, Android, Web), then:

- put them in `app.json` under `extra.googleOAuth.{ios,android,web}`
- list the same ids in the backend's `GOOGLE_OAUTH_CLIENT_IDS` (comma separated)

The iOS/Android clients need the bundle id / package name `com.tahminle.mobile`,
and all three (iOS, Android, Web) must live in the **same** Google Cloud project
so they share one OAuth consent screen. The Android client also needs the SHA-1
of the signing keystore EAS uses (`eas credentials -p android`). `redirectUri()`
in `lib/oauth.ts` prints the redirect URI to register, if the console asks for one.

**Apple** — Apple Developer portal → Certificates, Identifiers & Profiles →
your App ID → enable "Sign in with Apple". Then set the backend's
`APPLE_OAUTH_CLIENT_IDS` to `com.tahminle.mobile`. `app.json` already carries
`ios.usesAppleSignIn` and the config plugin.

> App Store Review Guideline 4.8: an iOS app offering third-party sign-in
> (Google) must also offer Sign in with Apple. Both are implemented here.

### Testing

Neither provider works in Expo Go — Apple needs an entitlement Expo Go doesn't
carry, and Google's native flow needs the real bundle id. Use a development
build:

```bash
npx eas build --profile development --platform ios     # or android
```

### First-run club pick

Accounts created through Google/Apple never see the sign-up form, so they
arrive with no club. `app/takim-sec.tsx` asks once, gated in `app/_layout.tsx`
on `user.favoriteTeam == null`. The backend's `PATCH /api/account/team` is
set-once: it only writes while the column is still null, so a club can be
chosen but never changed.

## Push notifications

The backend sends four kinds of push (all from `../lib/push.ts`, triggered by
the cron at `../app/api/cron/live-scores`):

| Trigger | Who gets it | Fired from |
|---|---|---|
| Goal scored | anyone with an open prediction on the match | `../lib/settlement.ts` |
| Prediction settled | each user, one summary per match | `../lib/settlement.ts` |
| Kickoff in 15 min | anyone with an open prediction | `../lib/reminders.ts` |
| Gift / transfer received | the recipient | `../lib/gifts.ts`, `../lib/transfers.ts` |

### One-time setup (required before push works at all)

`getExpoPushTokenAsync` needs an EAS project id. Until one exists, `lib/push.ts`
skips registration with a console warning instead of throwing:

```bash
cd mobile
npx eas login
npx eas init      # writes extra.eas.projectId into app.json
```

### Testing on a device

- **iOS**: works in Expo Go once `eas init` has been run.
- **Android**: push is **not** available in Expo Go (removed in SDK 53). You
  need a development build:

  ```bash
  npx eas build --profile development --platform android
  ```

  Install the resulting APK, then `npx expo start --dev-client`.

A simulator/emulator can never receive a real push — `Device.isDevice` is
false there and registration is skipped.

### Building for the stores

```bash
npx eas build --profile production --platform ios      # or android
```

`eas.json` pins `EXPO_PUBLIC_API_BASE_URL` per profile, so a store build always
points at the deployed backend rather than whatever is in your local
`.env.local`.

## Structure

```
app/
  _layout.tsx        # auth gate (Stack.Protected) + AuthProvider
  login.tsx, register.tsx
  (tabs)/             # Maç Günü · Tahminler · Cüzdan · Sıralama · Hesabım
components/           # RN ports of the web app's components
lib/                  # api client, auth context, theme, push registration,
                       # and shared pure logic copied from the web app's lib/
                       # (markets, format, types, clubLogos) so match/odds/
                       # label logic stays identical between web and mobile
```

The files copied verbatim from `../lib/` are `markets.ts`, `format.ts`,
`types.ts`, `predictionTypes.ts` — keep them in sync when the web app's change,
since the DTOs they describe come straight off the shared API.
