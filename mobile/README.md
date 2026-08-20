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
- Data endpoints live in `../app/api/{matches,wallet,predictions,leaderboard,account}`.
- Team logos/banners are loaded from the deployed backend's `/public` assets
  (`lib/teams.ts` builds URLs from `EXPO_PUBLIC_API_BASE_URL`), so no images
  are duplicated into this project.

## Structure

```
app/
  _layout.tsx        # auth gate (Stack.Protected) + AuthProvider
  login.tsx, register.tsx
  (tabs)/             # Maç Günü · Tahminler · Cüzdan · Sıralama · Hesabım
components/           # RN ports of the web app's components
lib/                  # api client, auth context, theme, and shared pure
                       # logic copied from the web app's lib/ (markets,
                       # format, types) so match/odds/label logic stays
                       # identical between web and mobile
```
