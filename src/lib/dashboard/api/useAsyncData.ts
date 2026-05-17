import { useEffect, useRef, useState } from "react";

/**
 * Tiny shared loader hook. Runs `fetcher` whenever any value in `deps`
 * changes and exposes `{ data, loading, error, reload }`. Cancellation is
 * handled with a flag so a stale fetch can't overwrite a newer result.
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

  return { data, loading, error, reload: () => setBump((b) => b + 1) };
}
