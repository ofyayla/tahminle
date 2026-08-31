import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";
import type { MatchDTO } from "./types";
import type { PredictionDTO } from "./predictionTypes";
import type { TeamCode } from "./teams";

const TOKEN_KEY = "tahminle_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error ?? "Bir şeyler ters gitti.", res.status);
  }
  return body as T;
}

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  favoriteTeam: TeamCode | null;
  balance: number;
  startBalance: number;
  createdAt: string;
  // Optional: an older deployed backend may not send this yet — treat
  // missing as "unknown", not "no password" (see hesabim.tsx).
  hasPassword?: boolean;
  // Personal code this account's invite links are built from (lib/referrals.ts
  // on the backend). Optional for the same reason hasPassword is — a client
  // can briefly be ahead of an older cached backend response.
  referralCode?: string;
};

// Mirrors lib/data.ts's LeaderboardRow — ranking is by net kâr, not balance.
export type LeaderboardRow = {
  rank: number;
  id: string;
  displayName: string;
  favoriteTeam: TeamCode | null;
  net: number;
  correct: number;
  total: number;
  accuracy: number;
  isYou: boolean;
};

export type LeaderboardScope = {
  ranked: LeaderboardRow[];
  you: LeaderboardRow | null;
  totalPlayers: number;
  rangeStart: string;
  rangeEnd: string;
};

// Mirrors lib/notifications.ts on the backend.
export type NotificationItem = {
  id: string;
  kind: "settled" | "gift" | "transfer" | "league_joined";
  status: "won" | "lost" | "mixed" | "info";
  title: string;
  body: string;
  amount: number | null;
  at: string;
};

export type TransferTarget = { id: string; displayName: string; favoriteTeam: TeamCode | null };

export type TransferHistoryItem = {
  id: string;
  direction: "in" | "out";
  amount: number;
  note: string | null;
  counterparty: string;
  createdAt: string;
};

export type ReceivedGift = {
  id: string;
  from: string;
  price: number;
  stake: number;
  opened: boolean;
  createdAt: string;
  pick: {
    match: string;
    kickoff: string;
    market: string;
    label: string;
    odds: number;
    status: string;
    payout: number | null;
  } | null;
};

export type SentGift = {
  id: string;
  to: string;
  price: number;
  fee: number;
  opened: boolean;
  createdAt: string;
  match: string;
  label: string;
  odds: number;
  status: string;
};

// Mirrors lib/data.ts's WeeklyBankoStatus.
export type WeeklyBankoStatus = { predictionId: string; matchId: string; label: string; locked: boolean } | null;

// Mirrors lib/perks.ts's UserPerkStatus.
export type UserPerkStatus = {
  doubleKasa: { available: boolean; usedForWeekStart: string | null };
  insurance: { available: boolean; usedForPredictionId: string | null };
};

// Mirrors lib/leagues.ts's MyLeague/LeagueDetail/LeaguePreview.
export type MyLeague = { id: string; name: string; inviteCode: string; memberCount: number; isOwner: boolean };
export type LeagueDetail = MyLeague & { week: LeaderboardScope; season: LeaderboardScope };
export type LeaguePreview = {
  name: string;
  memberCount: number;
  sampleMembers: { displayName: string; favoriteTeam: TeamCode | null }[];
};

// Mirrors lib/archive.ts.
export type WeeklyChampionEntry = { weekStart: string; displayName: string; favoriteTeam: TeamCode | null; net: number; bonus: number };
export type SeasonChampionEntry = { seasonStart: string; displayName: string; favoriteTeam: TeamCode | null; net: number };
export type FormPoint = { weekStart: string; net: number };

export const api = {
  login: (email: string, password: string) =>
    request<{ ok: true; token: string; user: { id: string; email: string; displayName: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  register: (
    email: string,
    password: string,
    displayName: string,
    favoriteTeam: TeamCode | null,
    invite?: { inviteCode: string; ref: string | null } | null
  ) =>
    request<{
      ok: true;
      token: string;
      user: { id: string; email: string; displayName: string };
      leagueJoined: { leagueId: string; rewardGranted: boolean } | null;
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        displayName,
        favoriteTeam,
        inviteCode: invite?.inviteCode ?? null,
        ref: invite?.ref ?? null,
      }),
    }),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  oauthLogin: (provider: "google" | "apple", idToken: string, fullName?: string | null) =>
    request<{
      ok: true;
      token: string;
      isNewUser: boolean;
      needsTeam: boolean;
      user: { id: string; email: string; displayName: string };
    }>("/api/auth/oauth", {
      method: "POST",
      body: JSON.stringify({ provider, idToken, fullName }),
    }),

  // Set-once: the backend rejects this with 409 if a club is already chosen.
  chooseTeam: (favoriteTeam: TeamCode) =>
    request<{ ok: true }>("/api/account/team", {
      method: "PATCH",
      body: JSON.stringify({ favoriteTeam }),
    }),

  getAccount: () =>
    request<{ user: CurrentUser; rank: number | null; totalPlayers: number }>("/api/account"),

  updateAccount: (displayName: string) =>
    request<{ ok: true; displayName: string }>("/api/account", {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    }),

  changePassword: (currentPassword: string | null, newPassword: string) =>
    request<{ ok: true }>("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Permanent, and required by Google Play for any app with accounts.
  // `confirm` must be the account's own displayName typed back — the backend
  // rejects anything else (app/api/account/route.ts explains why it isn't a
  // password check: OAuth-only accounts don't have one).
  deleteAccount: (confirm: string) =>
    request<{ ok: true }>("/api/account", {
      method: "DELETE",
      body: JSON.stringify({ confirm }),
    }),

  getCommunityFeed: () =>
    request<{
      feed: {
        id: string;
        displayName: string;
        favoriteTeam: TeamCode | null;
        market: string;
        choice: string;
        stake: number;
        homeTeam: string;
        awayTeam: string;
        isYou: boolean;
        at: string;
      }[];
    }>("/api/community-feed"),

  getActivity: () =>
    request<{
      activity: {
        id: string;
        kind: "system" | "lock" | "win" | "loss" | "cancel" | "insured";
        title: string;
        subtitle: string;
        amount: number;
        at: string;
      }[];
    }>("/api/activity"),


  getMatches: () =>
    request<{ matches: MatchDTO[]; available: number; weeklyBanko: WeeklyBankoStatus }>("/api/matches"),

  placePrediction: (matchId: string, market: string, choice: string, stake: number, isBanko = false) =>
    request<{ ok: true; prediction: unknown; bankoError: string | null }>("/api/predictions", {
      method: "POST",
      body: JSON.stringify({ matchId, market, choice, stake, isBanko }),
    }),

  setBanko: (predictionId: string) =>
    request<{ ok: true }>("/api/predictions/banko", {
      method: "POST",
      body: JSON.stringify({ predictionId }),
    }),

  clearBanko: (predictionId: string) =>
    request<{ ok: true }>("/api/predictions/banko", {
      method: "DELETE",
      body: JSON.stringify({ predictionId }),
    }),

  getPerks: () => request<UserPerkStatus>("/api/perks"),

  activateDoubleKasa: () => request<{ ok: true }>("/api/perks/double-kasa", { method: "POST" }),

  activateInsurance: (predictionId: string) =>
    request<{ ok: true }>("/api/perks/insurance", {
      method: "POST",
      body: JSON.stringify({ predictionId }),
    }),

  getMyLeagues: () => request<{ leagues: MyLeague[] }>("/api/leagues"),

  createLeague: (name: string) =>
    request<{ ok: true; leagueId: string; inviteCode: string }>("/api/leagues", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  joinLeague: (code: string, ref?: string | null) =>
    request<{ ok: true; leagueId: string }>("/api/leagues/join", {
      method: "POST",
      body: JSON.stringify({ code, ref: ref ?? null }),
    }),

  getLeagueDetail: (id: string) => request<{ league: LeagueDetail }>(`/api/leagues/${id}`),

  // Unauthenticated on the backend, but still routed through `request` (a
  // signed-in device just sends its token along for nothing) — this is what
  // the deep-linked register screen calls to show "X ligine katılıyorsun"
  // before the account even exists yet.
  getLeaguePreview: (code: string) =>
    request<{ league: LeaguePreview }>(`/api/leagues/preview/${encodeURIComponent(code)}`),

  leaveLeague: (id: string) => request<{ ok: true }>(`/api/leagues/${id}/leave`, { method: "POST" }),

  kickFromLeague: (id: string, userId: string) =>
    request<{ ok: true }>(`/api/leagues/${id}/kick`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  deleteLeague: (id: string) => request<{ ok: true }>(`/api/leagues/${id}`, { method: "DELETE" }),

  getArchive: () =>
    request<{
      weeklyChampions: WeeklyChampionEntry[];
      seasonChampions: SeasonChampionEntry[];
      form: FormPoint[];
      myWeeklyTitles: number;
      mySeasonTitles: number;
    }>("/api/archive"),

  getPredictions: () =>
    request<{
      open: PredictionDTO[];
      settled: PredictionDTO[];
      stats: { total: number; correct: number; netEffect: number };
    }>("/api/predictions"),

  getWallet: () =>
    request<{
      wallet: {
        available: number;
        lockedInOpen: number;
        total: number;
        potentialReturn: number;
        openCount: number;
        weekChange: number;
        totalNet: number;
        weeklyBudget: {
          cap: number;
          used: number;
          remaining: number;
          // Optional: the mobile app and the deployed backend redeploy
          // independently, so a client can briefly be ahead of the API
          // that added this field. budgetSegments() treats a missing value
          // as "no breakdown" rather than crashing.
          byMatch?: { matchId: string; label: string; stake: number }[];
        };
      };
      startBalance: number;
      activity: {
        id: string;
        kind: "system" | "lock" | "win" | "loss" | "cancel";
        title: string;
        subtitle: string;
        amount: number;
        at: string;
      }[];
    }>("/api/wallet"),

  getLeaderboard: () =>
    request<{
      week: LeaderboardScope;
      season: LeaderboardScope;
      feed: {
        id: string;
        displayName: string;
        favoriteTeam: TeamCode | null;
        market: string;
        choice: string;
        stake: number;
        homeTeam: string;
        awayTeam: string;
        isYou: boolean;
        at: string;
      }[];
    }>("/api/leaderboard"),

  getTransfers: () =>
    request<{
      targets: TransferTarget[];
      history: TransferHistoryItem[];
      limits: { min: number; max: number };
    }>("/api/transfers"),

  sendTransfer: (recipientId: string, amount: number, note: string | null) =>
    request<{ ok: true; transferId: string }>("/api/transfers", {
      method: "POST",
      body: JSON.stringify({ recipientId, amount, note }),
    }),

  getGifts: () =>
    request<{
      received: ReceivedGift[];
      sent: SentGift[];
      limits: { min: number; max: number };
    }>("/api/gifts"),

  sendGift: (recipientId: string, price: number) =>
    request<{ ok: true; giftId: string; fee: number }>("/api/gifts", {
      method: "POST",
      body: JSON.stringify({ recipientId, price }),
    }),

  openGift: (openGiftId: string) =>
    request<{ ok: true }>("/api/gifts", {
      method: "POST",
      body: JSON.stringify({ openGiftId }),
    }),

  getNotifications: () => request<{ items: NotificationItem[] }>("/api/notifications"),

  registerPushToken: (token: string, platform: "ios" | "android") =>
    request<{ ok: true }>("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),

  unregisterPushToken: (token: string) =>
    request<{ ok: true }>("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),
};
