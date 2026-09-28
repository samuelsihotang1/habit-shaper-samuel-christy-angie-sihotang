import { useMemo } from 'react';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import { api, ApiError } from '@/services/api';

/*
 * Every GET a page shows goes through SWR, keyed by its endpoint: two screens
 * asking for /habits share one request and one cached answer, and a screen
 * opened again shows that answer at once while it asks the server again.
 */

const fetchData = <T>(endpoint: string): Promise<T> => api.get<T>(endpoint).then((response) => response.data);

// A 4xx answers the same on every retry; only an unreachable server or a 5xx is worth asking again.
const OPTIONS: SWRConfiguration = {
  shouldRetryOnError: (error) => !(error instanceof ApiError) || error.status === 0 || error.status >= 500,
};

/** `null` skips the request. */
export const useData = <T>(key: string | null, config?: SWRConfiguration<T, ApiError>) =>
  useSWR<T, ApiError>(key, fetchData<T>, config ? { ...OPTIONS, ...config } : OPTIONS);

/**
 * Writes to the cache the nearest <SWRConfig> holds, not SWR's global one:
 * the global `mutate` would miss a test's private cache.
 */
export function useCache() {
  const { mutate } = useSWRConfig();
  return useMemo(
    () => ({
      mutate,
      /** Fetches every cached endpoint under these paths again: now if a screen shows it, else when one next does. */
      revalidate(...paths: string[]) {
        void mutate((key) => typeof key === 'string' && paths.some((path) => key.startsWith(path)));
      },
      /** Forgets every answer, so the next account signed in on this browser never sees this one's. */
      clear() {
        void mutate(() => true, undefined, { revalidate: false });
      },
    }),
    [mutate],
  );
}

/** For a cached list: `item` replaces its old copy, or joins the end as the API orders by creation. */
export const upsert =
  <T extends { id: string }>(item: T) =>
  (list?: T[]) =>
    list && (list.some((entry) => entry.id === item.id) ? list.map((entry) => (entry.id === item.id ? item : entry)) : [...list, item]);

export const without =
  <T extends { id: string }>(id: string) =>
  (list?: T[]) =>
    list?.filter((entry) => entry.id !== id);
