/**
 * /portal/tracking — Client fleet tracking globe.
 *
 * 40 / 60 split:
 *  • Left  (40 %) — scrollable list of the client's non-delivered shipments.
 *  • Right (60 %) — interactive 3D globe showing ONLY that client's vessels.
 *
 * Security: getClientShipments() is always scoped to the authenticated
 * user's client_id — the globe can never render arcs for another client.
 *
 * Vessel positions are interpolated:
 *   Booked       → at POL
 *   In Transit   → lerp(POL, POD, elapsed / duration)
 *   Discharged / Customs Hold / Released → at POD
 *   Delivered    → hidden (not rendered on globe)
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Anchor,
  CheckCheck,
  ChevronRight,
  Clock,
  Container,
  Globe2,
  MapPin,
  Package,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { FleetGlobe } from "@/components/dashboard/FleetGlobe";
import type { GlobeArc, GlobePoint, GlobeVessel } from "@/components/dashboard/FleetGlobe";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getClientShipments,
  useAsyncData,
  PORTAL_DEMO_CLIENT_ID,
  type ClientShipment,
  type ShipmentPhase,
} from "@/lib/dashboard/api";
import { portCoord } from "@/data/dashboard/ports";

/* ── Route ───────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/portal/tracking")({
  validateSearch: (search: Record<string, unknown>) => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({
    meta: [{ title: "Live Tracking — Altun Logistics Portal" }],
  }),
  component: PortalTrackingPage,
});

/* ── Vessel position interpolation ──────────────────────────────────────── */

/**
 * Returns the current estimated lat/lng of a vessel based on phase and dates.
 * Returns null for Delivered shipments (not rendered on the globe).
 */
function vesselPosition(
  s: ClientShipment,
): { lat: number; lng: number } | null {
  if (s.phase === "Delivered") return null;

  const pol = portCoord(s.pol);
  const pod = portCoord(s.pod);

  if (s.phase === "Booked") return pol;

  if (
    s.phase === "Discharged" ||
    s.phase === "Customs Hold" ||
    s.phase === "Released"
  ) {
    return pod;
  }

  // In Transit — linear interpolation between POL and POD.
  const now = Date.now();
  const etd = new Date(s.etd).getTime();
  const eta = new Date(s.eta).getTime();
  const total = eta - etd;
  if (total <= 0) return pod;

  const elapsed = Math.min(Math.max(now - etd, 0), total);
  const t = elapsed / total;

  return {
    lat: pol.lat + (pod.lat - pol.lat) * t,
    lng: pol.lng + (pod.lng - pol.lng) * t,
  };
}

/* ── Phase badge helpers ─────────────────────────────────────────────────── */

interface PhaseBadge {
  label: string;
  cls: string;
  icon: React.ReactNode;
}

function getPhaseBadge(phase: ShipmentPhase, onHold: boolean): PhaseBadge {
  if (onHold || phase === "Customs Hold") {
    return {
      label: "Customs Review",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      icon: <AlertTriangle className="h-2.5 w-2.5" />,
    };
  }
  switch (phase) {
    case "Booked":
      return {
        label: "Booked",
        cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        icon: <Package className="h-2.5 w-2.5" />,
      };
    case "In Transit":
      return {
        label: "In Transit",
        cls: "border-brand/40 bg-brand/10 text-brand",
        icon: <Ship className="h-2.5 w-2.5" />,
      };
    case "Discharged":
      return {
        label: "Discharged",
        cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        icon: <Container className="h-2.5 w-2.5" />,
      };
    case "Released":
      return {
        label: "Released",
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: <CheckCheck className="h-2.5 w-2.5" />,
      };
    case "Delivered":
      return {
        label: "Delivered",
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        icon: <CheckCheck className="h-2.5 w-2.5" />,
      };
  }
}

/* ── Tracking card (left panel list item) ───────────────────────────────── */

function TrackingCard({
  shipment,
  focused,
  onClick,
}: {
  shipment: ClientShipment;
  focused: boolean;
  onClick: () => void;
}) {
  const badge = getPhaseBadge(shipment.phase, shipment.onCustomsHold);
  const vesselPos = vesselPosition(shipment);
  const isAtSea = shipment.phase === "In Transit";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full text-left rounded-xl border p-3.5 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        focused
          ? "border-brand/50 bg-brand/[0.06] shadow-[0_0_0_1px_var(--brand)/0.2]"
          : "border-border bg-foreground/[0.02] hover:border-brand/25 hover:bg-foreground/[0.04]",
      )}
    >
      {/* Top row: ref + badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-[0.82rem] text-foreground leading-snug">
            {shipment.id}
          </p>
          <p className="text-[0.62rem] text-muted-foreground font-mono mt-0.5">
            {shipment.vessel}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold shrink-0",
            badge.cls,
          )}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>

      {/* Route row */}
      <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        <span className="font-medium text-foreground/80">{shipment.pol}</span>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
        <span className="font-medium text-foreground/80">{shipment.pod}</span>
      </div>

      {/* ETA row + at-sea pulse indicator */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {isAtSea && vesselPos && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-brand animate-pulse shrink-0" />
          )}
          <span className="text-[0.62rem] text-muted-foreground">
            {isAtSea ? "At sea" : shipment.phase === "Booked" ? "Departing" : "Arrived"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[0.62rem]">
          <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
          <span className="text-muted-foreground">
            ETA{" "}
            {new Date(shipment.eta).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function PortalTrackingPage() {
  const { user } = useAuth();
  const clientId = user?.id ?? PORTAL_DEMO_CLIENT_ID;
  const { focus: searchFocus } = Route.useSearch();

  const { data, loading, error } = useAsyncData(
    () => getClientShipments(clientId),
    [clientId],
  );

  const shipments = useMemo(() => data ?? [], [data]);

  // Exclude Delivered — nothing to track on the globe.
  const activeShipments = useMemo(
    () => shipments.filter((s) => s.phase !== "Delivered"),
    [shipments],
  );

  // focusedId: prefer URL param on first render, then allow user override.
  const [focusedId, setFocusedId] = useState<string | null>(
    searchFocus ?? null,
  );

  const focusedShipment = useMemo(
    () =>
      focusedId ? activeShipments.find((s) => s.id === focusedId) ?? null : null,
    [focusedId, activeShipments],
  );

  /* ── Globe data — strictly scoped to this client ── */

  const arcs = useMemo<GlobeArc[]>(
    () =>
      activeShipments.map((s) => {
        const pol = portCoord(s.pol);
        const pod = portCoord(s.pod);
        return {
          startLat: pol.lat,
          startLng: pol.lng,
          endLat: pod.lat,
          endLng: pod.lng,
        };
      }),
    [activeShipments],
  );

  const points = useMemo<GlobePoint[]>(() => {
    const seen = new Set<string>();
    const pts: GlobePoint[] = [];
    activeShipments.forEach((s) => {
      for (const name of [s.pol, s.pod]) {
        if (!seen.has(name)) {
          seen.add(name);
          const c = portCoord(name);
          pts.push({ lat: c.lat, lng: c.lng, label: name });
        }
      }
    });
    return pts;
  }, [activeShipments]);

  const vessels = useMemo<GlobeVessel[]>(() => {
    const result: GlobeVessel[] = [];
    for (const s of activeShipments) {
      const pos = vesselPosition(s);
      if (!pos) continue;
      result.push({
        lat: pos.lat,
        lng: pos.lng,
        label: s.id,
        focused: s.id === focusedId,
      });
    }
    return result;
  }, [activeShipments, focusedId]);

  /* ── Globe focus point ── */
  const globeFocus = useMemo(() => {
    if (!focusedShipment) return null;
    const pos = vesselPosition(focusedShipment);
    return pos ?? portCoord(focusedShipment.pod);
  }, [focusedShipment]);

  /* ── Loading ── */
  if (loading) {
    return (
      <PortalLayout lockViewport>
        <div className="h-full flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 animate-pulse">
            <Anchor className="h-5 w-5 text-brand" />
          </span>
          <p className="text-sm text-muted-foreground">Loading fleet data…</p>
        </div>
      </PortalLayout>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <PortalLayout lockViewport>
        <div className="h-full flex items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-semibold">Could not load fleet data</p>
        </div>
      </PortalLayout>
    );
  }

  /* ── Main ── */
  return (
    <PortalLayout lockViewport>
      <div className="h-full flex gap-4 lg:gap-5 min-h-0 overflow-hidden">

        {/* ── Left panel — 40 % ── */}
        <div className="w-[38%] min-w-[240px] max-w-[340px] flex flex-col min-h-0 overflow-hidden">

          {/* Panel header */}
          <div className="shrink-0 flex items-center gap-2.5 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 shrink-0">
              <Globe2 className="h-3.5 w-3.5 text-brand" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[0.9rem] font-bold text-foreground leading-snug">
                Live Tracking
              </h1>
              <p className="text-[0.62rem] text-muted-foreground">
                {activeShipments.length} vessel
                {activeShipments.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
          </div>

          {/* Shipment list */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin space-y-2 pr-1">
            {activeShipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Ship className="h-7 w-7 text-muted-foreground/25" />
                <p className="text-[0.78rem] text-muted-foreground text-center">
                  No active shipments to track
                </p>
                <Link
                  to="/portal/shipments"
                  className="text-[0.72rem] font-semibold text-brand hover:opacity-80 transition-opacity"
                >
                  View all shipments →
                </Link>
              </div>
            ) : (
              activeShipments.map((s) => (
                <TrackingCard
                  key={s.id}
                  shipment={s}
                  focused={s.id === focusedId}
                  onClick={() =>
                    setFocusedId((prev) => (prev === s.id ? null : s.id))
                  }
                />
              ))
            )}
          </div>

          {/* Panel footer note */}
          <div className="shrink-0 mt-3 rounded-lg border border-border/60 bg-foreground/[0.015] px-3 py-2">
            <p className="text-[0.62rem] text-muted-foreground leading-relaxed">
              Vessel positions are estimated. Click a shipment card to fly the
              globe to its current location.
            </p>
          </div>
        </div>

        {/* ── Right panel — Globe 60 % ── */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden border border-border/60 relative bg-black/10">
          {/* Subtle overlay legend */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 glass-panel rounded-xl border border-border/60 px-3 py-2.5 shadow-[var(--shadow-elevated)]">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 mb-0.5">
              Legend
            </p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
              <span className="text-[0.65rem] text-muted-foreground">Vessel position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[0.65rem] text-muted-foreground">Selected vessel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-emerald-400 to-cyan-400 shrink-0" />
              <span className="text-[0.65rem] text-muted-foreground">Trade route</span>
            </div>
          </div>

          <FleetGlobe
            arcs={arcs}
            points={points}
            vessels={vessels}
            focus={globeFocus}
            interactive
            autoRotate={!focusedId}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
