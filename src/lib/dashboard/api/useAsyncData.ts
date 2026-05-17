import { useEffect, useRef, useState } from "react";

/**
 * Tiny shared loader hook. Runs `fetcher` whenever any value in `deps`
 * changes and exposes `{ data, loading, error, reload }`. Cancellation is
 * handled with a flag so a stale fetch can't overwrite a newer result.
 *
 * Pass `pollInterval` (ms) to re-fetch on a timer — useful for live D&D
 * countdowns and shipment status updates. The poll fires only while the
 * hook is mounted; it pauses if the tab is hidden (via Page Visibility API).
 *
 * Intentionally minimal — no caching, no retries, no SWR. Swap in
 * @tanstack/react-query (already installed) when the real backend lands.
 */
export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  pollInterval?: number,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [bump, setBump] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, bump]);

  // Polling — silent background refreshes that skip loading state so the
  // UI doesn't flash. Pauses when the tab is hidden.
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;

    const id = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetcherRef
        .current()
        .then((value) => setData(value))
        .catch(() => {
          /* silent — errors surfaced only on the initial / manual reload */
        });
    }, pollInterval);

    return () => clearInterval(id);
    // pollInterval is intentionally static after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollInterval]);

  return { data, loading, error, reload: () => setBump((b) => b + 1) };
}
