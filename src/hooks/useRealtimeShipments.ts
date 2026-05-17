/**
 * useRealtimeShipments
 *
 * Fetches ocean shipments once on mount and then keeps the data live via a
 * Supabase Realtime Postgres-changes channel. This replaces the old 30-second
 * `pollInterval` pattern: instead of hammering the database every 30 s, the
 * client receives a push notification the instant any row in `ocean_shipments`
 * is inserted, updated, or deleted, and then silently re-fetches the full
 * table so the UI reflects the change within milliseconds.
 *
 * ── Modes ───────────────────────────────────────────────────────────────────
 *
 *  Live (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY configured):
 *   • Initial load via `getOceanShipments()` (Supabase query + row mapping).
 *   • Subscribes to `postgres_changes` on `public.ocean_shipments` for all
 *     events (`INSERT`, `UPDATE`, `DELETE`).
 *   • On any event: silently re-fetches the full list — avoids duplicating
 *     the `rowToShipment` mapping by re-using `getOceanShipments()` directly.
 *   • On unmount: `supabase.removeChannel()` tears down the WebSocket so
 *     there are no dangling connections or memory leaks.
 *
 *  Mock (env vars absent / placeholder):
 *   • `getOceanShipments()` returns the static fixture data.
 *   • No channel is created (nothing to subscribe to on mock data).
 *
 * ── Supabase prerequisites ───────────────────────────────────────────────────
 *   • The `ocean_shipments` table must be added to the `supabase_realtime`
 *     publication. Migration 0007 handles this idempotently.
 *   • Realtime must be enabled in Project Settings → API → Realtime.
 *   • Default REPLICA IDENTITY (primary key only) is sufficient because we
 *     re-fetch the full row from PostgREST on each event — we don't rely on
 *     the payload's `new`/`old` record.
 */

import { useEffect, useRef, useState } from "react";
import { getOceanShipments, type OceanShipment } from "@/lib/dashboard/api";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ── Public interface (mirrors AsyncDataState<OceanShipment[]>) ────────────────

export interface RealtimeShipmentsState {
  data: OceanShipment[] | null;
  loading: boolean;
  error: Error | null;
  /**
   * Manually trigger a full re-fetch — useful for pull-to-refresh or after a
   * user-initiated action that may have mutated a shipment.
   */
  reload: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeShipments(): RealtimeShipmentsState {
  const [data, setData] = useState<OceanShipment[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementing `bump` re-runs the fetch effect (used by `reload()`).
  const [bump, setBump] = useState(0);
  // Guards stale fetches from overwriting newer results after unmount / bump.
  const cancelledRef = useRef(false);

  // ── Initial fetch (and manual reload) ──────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    getOceanShipments()
      .then((result) => {
        if (cancelledRef.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
    // bump is the only intentional dep — deps are exhaustive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);

  // ── Supabase Realtime channel ───────────────────────────────────────────────
  useEffect(() => {
    // No-op in mock/unconfigured mode — static fixture data never changes.
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("ocean_shipments_realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT | UPDATE | DELETE
          schema: "public",
          table: "ocean_shipments",
        },
        () => {
          // Background silent refetch — preserve existing data on failure,
          // do NOT reset loading/error state (would flash the UI).
          getOceanShipments()
            .then((result) => {
              if (!cancelledRef.current) setData(result);
            })
            .catch(() => {
              // Swallow silently: stale data is still better than an error flash.
              // The next manual reload or channel reconnect will recover.
            });
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(
            "[useRealtimeShipments] Realtime channel error — live updates paused.",
            err,
          );
        }
        if (status === "TIMED_OUT") {
          console.warn(
            "[useRealtimeShipments] Realtime channel timed out — will attempt reconnect.",
          );
        }
      });

    return () => {
      // Strict cleanup: remove the channel and its WebSocket when the
      // component unmounts or the effect re-runs (which it never does here).
      void supabase.removeChannel(channel);
    };
    // Empty deps: channel is created once per mount; cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    loading,
    error,
    reload: () => setBump((b) => b + 1),
  };
}
