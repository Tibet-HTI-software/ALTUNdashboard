/**
 * DashboardFilterContext
 *
 * Global cross-filter store for ocean shipment views.
 * Uses the same module-scoped singleton + CustomEvent pattern as
 * `useGlobalSearch` and `useRealtimeConnectionStatus` — no React
 * Context Provider needed, zero prop drilling.
 *
 * Consumers:
 *   `useDashboardFilters()` — read + mutate filters from any component.
 *   `applyFilters(shipments, filters)` — pure filter function used by
 *   `useFilteredShipments`.
 *
 * The filter state is shared across tabs via the event bus, so switching
 * from the Demurrage Board to Fleet Tracking preserves active filters.
 */

import { useEffect, useState } from "react";
import type { OceanShipment } from "@/lib/dashboard/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CarrierFilter =
  | "Maersk"
  | "MSC"
  | "CMA CGM"
  | "Hapag-Lloyd"
  | "ONE"
  | "Evergreen";

export type CustomsStatusFilter = "all" | "hold";

export interface DashboardFilters {
  /** null = all carriers */
  carrier: CarrierFilter | null;
  /** "hold" = show only Customs Hold shipments */
  customsStatus: CustomsStatusFilter;
  /** null = all traders / consignees */
  consignee: string | null;
}

/** Available carrier options (derived from the CarrierName enum in mock data). */
export const FILTER_CARRIERS: CarrierFilter[] = [
  "Maersk",
  "MSC",
  "CMA CGM",
  "Hapag-Lloyd",
  "ONE",
  "Evergreen",
];

// ── Singleton store ────────────────────────────────────────────────────────────

const FILTER_EVENT = "altun:dashboard-filter";

const DEFAULT_FILTERS: DashboardFilters = {
  carrier: null,
  customsStatus: "all",
  consignee: null,
};

/** Module-scoped value survives route changes (just like `useGlobalSearch`). */
let _current: DashboardFilters = { ...DEFAULT_FILTERS };

function broadcast(next: DashboardFilters) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<DashboardFilters>(FILTER_EVENT, { detail: { ...next } }),
    );
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useDashboardFilters() {
  const [filters, setFiltersState] = useState<DashboardFilters>(_current);

  useEffect(() => {
    // Adopt the current value if it was set before this consumer mounted.
    if (JSON.stringify(_current) !== JSON.stringify(filters)) {
      setFiltersState({ ..._current });
    }

    function handler(e: Event) {
      setFiltersState((e as CustomEvent<DashboardFilters>).detail);
    }
    window.addEventListener(FILTER_EVENT, handler);
    return () => window.removeEventListener(FILTER_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFilters(patch: Partial<DashboardFilters>) {
    _current = { ..._current, ...patch };
    broadcast(_current);
  }

  function clearFilters() {
    _current = { ...DEFAULT_FILTERS };
    broadcast(_current);
  }

  /** How many non-default filters are active — drives the topbar badge. */
  const activeCount = [
    filters.carrier !== null,
    filters.customsStatus !== "all",
    filters.consignee !== null,
  ].filter(Boolean).length;

  return { filters, setFilters, clearFilters, activeCount };
}

// ── Pure filter function ───────────────────────────────────────────────────────

/**
 * Apply `DashboardFilters` to a shipment array.
 * Pure + synchronous — safe to call inside `useMemo`.
 */
export function applyFilters(
  shipments: OceanShipment[],
  filters: DashboardFilters,
): OceanShipment[] {
  if (
    filters.carrier === null &&
    filters.customsStatus === "all" &&
    filters.consignee === null
  ) {
    return shipments; // fast path: no active filters
  }

  return shipments.filter((s) => {
    if (filters.carrier !== null && s.carrier !== filters.carrier) return false;
    if (filters.customsStatus === "hold" && s.customsBlock === null) return false;
    if (
      filters.consignee !== null &&
      !s.trader.toLowerCase().includes(filters.consignee.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}
