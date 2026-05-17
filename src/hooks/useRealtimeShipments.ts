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
 *   • `wsStatus` is permanently `"idle"` (topbar shows green "Systems live").
 *
 * ── WebSocket resiliency ─────────────────────────────────────────────────────
 *  If the channel enters `CHANNEL_ERROR` or `TIMED_OUT`, the hook:
 *   1. Records the error and sets `wsStatus` → `"reconnecting"`.
 *   2. Increments the attempt counter and schedules a reconnect with
 *      full-jitter exponential backoff (base 2 s, cap 60 s, ±30% jitter).
 *   3. On the next attempt, tears down the old channel and subscribes a fresh
 *      one — Supabase's internal WS transport is recreated from scratch.
 *   4. On successful `SUBSCRIBED`, resets the counter and sets `wsStatus` → "live".
 *
 *  The current `wsStatus` is broadcast via a `CustomEvent` so the topbar
 *  can display a live connection indicator without prop-drilling.
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

// ── Connection status ─────────────────────────────────────────────────────────

export type RealtimeConnectionStatus =
  | "idle"          // mock mode — no channel needed
  | "connecting"    // channel subscribed, awaiting SUBSCRIBED ack
  | "live"          // SUBSCRIBED — receiving changes
  | "reconnecting"  // CHANNEL_ERROR / TIMED_OUT — backoff timer running
  | "error";        // max retries exhausted (reserved; currently retries forever)

/** CustomEvent name used to broadcast status changes globally. */
export const REALTIME_STATUS_EVENT = "altun:realtime-status";

// ── Backoff helpers ───────────────────────────────────────────────────────────

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS  = 60_000;
const MAX_RETRIES     = 10; // after this, stop auto-retrying and set "error"

/** Full-jitter exponential backoff: base * 2^attempt, capped, ±30%. */
function backoffMs(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
  return Math.round(base * (1 + Math.random() * 0.3));
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface RealtimeShipmentsState {
  data: OceanShipment[] | null;
  loading: boolean;
  error: Error | null;
  /** Current WebSocket channel state — drives the topbar indicator. */
  wsStatus: RealtimeConnectionStatus;
  /**
   * Manually trigger a full re-fetch — useful for pull-to-refresh or after a
   * user-initiated action that may have mutated a shipment.
   */
  reload: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeShipments(): RealtimeShipmentsState {
  const [data, setData]       = useState<OceanShipment[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<Error | null>(null);
  const [wsStatus, setWsStatus] = useState<RealtimeConnectionStatus>(
    isSupabaseConfigured ? "connecting" : "idle",
  );

  // Incrementing `bump` re-runs the fetch effect (used by `reload()`).
  const [bump, setBump] = useState(0);
  // Incrementing `channelBump` tears down + recreates the Realtime channel.
  const [channelBump, setChannelBump] = useState(0);

  // Guards stale fetches from overwriting newer results after unmount / bump.
  const cancelledRef   = useRef(false);
  // Tracks how many consecutive reconnect attempts have been made.
  const attemptRef     = useRef(0);
  // Holds the backoff timeout handle so it can be cancelled on unmount.
  const retryTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Broadcast status changes globally (topbar reads via CustomEvent) ────────
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<RealtimeConnectionStatus>(REALTIME_STATUS_EVENT, {
        detail: wsStatus,
      }),
    );
  }, [wsStatus]);

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

  // ── Supabase Realtime channel (with exponential-backoff reconnect) ──────────
  useEffect(() => {
    // No-op in mock/unconfigured mode — static fixture data never changes.
    if (!isSupabaseConfigured) return;

    // Clear any pending backoff timer from the previous attempt before we
    // spin up a new channel.
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setWsStatus("connecting");

    const channel = supabase
      .channel(`ocean_shipments_realtime_${channelBump}`)
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
        switch (status) {
          case "SUBSCRIBED":
            // Channel is live — reset backoff state.
            attemptRef.current = 0;
            setWsStatus("live");
            break;

          case "CHANNEL_ERROR":
            console.warn(
              "[useRealtimeShipments] Channel error — scheduling reconnect.",
              err,
            );
            scheduleReconnect();
            break;

          case "TIMED_OUT":
            console.warn(
              "[useRealtimeShipments] Channel timed out — scheduling reconnect.",
            );
            scheduleReconnect();
            break;

          // "CLOSED" fires when we explicitly call removeChannel — not an error.
        }
      });

    function scheduleReconnect() {
      attemptRef.current += 1;

      if (attemptRef.current > MAX_RETRIES) {
        console.error(
          `[useRealtimeShipments] ${MAX_RETRIES} reconnect attempts failed — entering error state.`,
        );
        setWsStatus("error");
        return;
      }

      const delay = backoffMs(attemptRef.current - 1);
      console.info(
        `[useRealtimeShipments] Reconnecting in ${(delay / 1000).toFixed(1)}s ` +
          `(attempt ${attemptRef.current}/${MAX_RETRIES})…`,
      );
      setWsStatus("reconnecting");

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        // Bump channelBump → effect re-runs → old channel torn down, new one created.
        setChannelBump((b) => b + 1);
      }, delay);
    }

    return () => {
      // Cancel any pending backoff timer first so scheduleReconnect can't
      // fire after unmount and attempt to update unmounted state.
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
    // channelBump drives intentional channel teardown + recreate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelBump]);

  return {
    data,
    loading,
    error,
    wsStatus,
    reload: () => setBump((b) => b + 1),
  };
}
