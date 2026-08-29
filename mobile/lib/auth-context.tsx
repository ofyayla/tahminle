import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, clearToken, getToken, setToken, type CurrentUser } from "./api";
import { registerForPush, unregisterFromPush } from "./push";
import type { TeamCode } from "./teams";

type AuthContextValue = {
  user: CurrentUser | null;
  rank: number | null;
  totalPlayers: number;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    favoriteTeam: TeamCode | null
  ) => Promise<void>;
  loginWithOAuth: (
    provider: "google" | "apple",
    idToken: string,
    fullName?: string | null
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  // Stable references: a screen's useFocusEffect(..., [refresh]) must not
  // re-fire just because AuthProvider re-rendered — that caused an infinite
  // refresh loop on the Hesabım tab (each refresh() call re-rendered this
  // provider, which recreated `refresh`, which re-triggered the effect).
  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getAccount();
      setUser(data.user);
      setRank(data.rank);
      setTotalPlayers(data.totalPlayers);
      // Re-registering on every confirmed session keeps the token pointed at
      // the right user and revives one the backend dropped as stale. It's a
      // no-op once the token is already on file.
      void registerForPush();
    } catch (err) {
      // Only a genuine "you're not authenticated" response should sign the
      // user out. A network blip or a slow/cold backend must not wipe an
      // otherwise-valid session.
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await setToken(res.token);
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string, favoriteTeam: TeamCode | null) => {
      const res = await api.register(email, password, displayName, favoriteTeam);
      await setToken(res.token);
      await refresh();
    },
    [refresh]
  );

  const loginWithOAuth = useCallback(
    async (provider: "google" | "apple", idToken: string, fullName?: string | null) => {
      const res = await api.oauthLogin(provider, idToken, fullName);
      await setToken(res.token);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    // Drop the push token before the session goes away — the backend needs a
    // valid session to know whose token it is.
    await unregisterFromPush();
    await api.logout().catch(() => {});
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, rank, totalPlayers, loading, login, register, loginWithOAuth, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
