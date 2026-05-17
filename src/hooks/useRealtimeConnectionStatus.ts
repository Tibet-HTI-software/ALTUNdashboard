/**
 * useRealtimeConnectionStatus
 *
 * Lightweight hook that tracks the WebSocket connection state of the
 * `useRealtimeShipments` channel without requiring a shared React context.
 *
 * Design: `useRealtimeShipments` dispatches a `CustomEvent` whenever its
 * internal `wsStatus` changes. This hook subscribes to that event and
 * returns the latest value — any component that renders this hook stays
 * in sync, regardless of where it sits in the tree.
 *
 * The initial value is `"idle"` (no flash / incorrect state before the
 * first event fires). In practice the first `CustomEvent` arrives within
 * milliseconds of mount because `useRealtimeShipments` broadcasts on its
 * own mount as part of the `useEffect([wsStatus])` that initialises.
 */

import { useEffect, useState } from "react";
import {
  REALTIME_STATUS_EVENT,
  type RealtimeConnectionStatus,
} from "./useRealtimeShipments";

export function useRealtimeConnectionStatus(): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");

  useEffect(() => {
    function handler(e: Event) {
      setStatus((e as CustomEvent<RealtimeConnectionStatus>).detail);
    }
    window.addEventListener(REALTIME_STATUS_EVENT, handler);
    return () => window.removeEventListener(REALTIME_STATUS_EVENT, handler);
  }, []);

  return status;
}
