import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ApiError } from "./api";

// Shared load/refresh plumbing for the tab screens.
//
// Every screen used to run `load().finally(() => setLoading(false))`, which
// has no rejection handler — so any failed request (a cold backend, an
// endpoint the deployed API doesn't have yet, a dropped connection) surfaced
// as an uncaught promise rejection and a red error overlay instead of
// something the user could act on. Centralising it means that can't silently
// come back the next time a screen is added.
export function useScreenLoad(load: () => Promise<void>) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    try {
      setError(null);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Bağlantı kurulamadı. Aşağı çekip tekrar dene."
      );
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      run().finally(() => setLoading(false));
    }, [run])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  return { loading, refreshing, error, refresh, reload: run };
}
