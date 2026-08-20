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

  getAccount: () =>
    request<{ user: CurrentUser; rank: number | null; totalPlayers: number }>("/api/account"),

  updateFavoriteTeam: (favoriteTeam: TeamCode | null) =>
    request<{ ok: true }>("/api/account/team", {
      method: "PATCH",
      body: JSON.stringify({ favoriteTeam }),
    }),

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
      };
      startBalance: number;
      activity: {
        id: string;
        kind: "system" | "lock" | "win" | "loss";
        title: string;
        subtitle: string;
        amount: number;
        at: string;
      }[];
    }>("/api/wallet"),

  getLeaderboard: () =>
    request<{
      ranked: {
        rank: number;
        id: string;
        displayName: string;
        favoriteTeam: TeamCode | null;
        balance: number;
        isYou: boolean;
      }[];
      you: { rank: number; balance: number } | null;
      totalPlayers: number;
      feed: {
        id: string;
        displayName: string;
        favoriteTeam: TeamCode | null;
        market: string;
        choice: string;
        homeTeam: string;
        awayTeam: string;
        isYou: boolean;
        at: string;
      }[];
    }>("/api/leaderboard"),
};
