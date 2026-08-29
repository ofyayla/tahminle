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
  kind: "settled" | "gift" | "transfer";
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

export const api = {
  login: (email: string, password: string) =>
    request<{ ok: true; token: string; user: { id: string; email: string; displayName: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  register: (email: string, password: string, displayName: string, favoriteTeam: TeamCode | null) =>
    request<{ ok: true; token: string; user: { id: string; email: string; displayName: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, displayName, favoriteTeam }) }
    ),

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


  getMatches: () => request<{ matches: MatchDTO[]; available: number }>("/api/matches"),

  placePrediction: (matchId: string, market: string, choice: string, stake: number) =>
    request<{ ok: true; prediction: unknown }>("/api/predictions", {
      method: "POST",
      body: JSON.stringify({ matchId, market, choice, stake }),
    }),

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
          byMatch: { matchId: string; label: string; stake: number }[];
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
