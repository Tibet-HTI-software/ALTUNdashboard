/**
 * useFilteredShipments
 *
 * Thin wrapper that combines `useRealtimeShipments` (live WebSocket data)
 * with `useDashboardFilters` (global cross-filter state) to produce a
 * filtered view without touching the WS connection.
 *
 * Changing a filter never disconnects or re-subscribes the channel —
 * it only mutates the `data` return value via a `useMemo` derivation.
 *
 * Use this instead of `useRealtimeShipments` directly in any view that
 * should respect the global filter state (fleet-tracking, delay-risk…).
 */

import { useMemo } from "react";
import {
  useRealtimeShipments,
  type RealtimeShipmentsState,
} from "./useRealtimeShipments";
import {
  useDashboardFilters,
  applyFilters,
} from "@/lib/dashboard/DashboardFilterContext";
import type { OceanShipment } from "@/lib/dashboard/api";

export interface FilteredShipmentsState extends RealtimeShipmentsState {
  /** Filtered subset — may be smaller than unfilteredData when filters active. */
  data: OceanShipment[] | null;
  /** Full unfiltered dataset (e.g. for deriving filter option lists). */
  unfilteredData: OceanShipment[] | null;
  /** Number of non-default active filters. */
  activeFilterCount: number;
}

export function useFilteredShipments(): FilteredShipmentsState {
  const realtime = useRealtimeShipments();
  const { filters, activeCount } = useDashboardFilters();

  const filteredData = useMemo(
    () =>
      realtime.data !== null ? applyFilters(realtime.data, filters) : null,
    [realtime.data, filters],
  );

  return {
    ...realtime,
    data: filteredData,
    unfilteredData: realtime.data,
    activeFilterCount: activeCount,
  };
}
