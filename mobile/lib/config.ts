// Point this at your deployed Next.js backend (Vercel URL) or your LAN IP
// during local development (e.g. http://192.168.1.23:3000 — "localhost"
// resolves to the phone/simulator itself, not your dev machine).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://tahminle.vercel.app";
