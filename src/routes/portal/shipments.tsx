/**
 * /portal/shipments — Client-facing shipment tracker.
 *
 * Designed for clients: clean status cards, no internal operations data.
 * Exposed fields: reference, B/L, route, carrier, vessel, phase, ETA.
 * Hidden fields: D&D rates, customs block reasons, trader contacts, pricing.
 *
 * Data is fetched via getClientShipments(clientId) which enforces strict
 * client isolation at both the application and database layers.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
  Search,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Co2FootprintWidget } from "@/components/dashboard/Co2FootprintWidget";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getClientShipments,
  useAsyncData,
  PORTAL_DEMO_CLIENT_ID,
  type ClientShipment,
  type ShipmentPhase,
} from "@/lib/dashboard/api";

export const Route = createFileRoute("/portal/shipments")({
  head: () => ({
    meta: [{ title: "My Shipments — Altun Logistics Portal" }],
  }),
  component: PortalShipmentsPage,
});

/* ── Phase display helpers ───────────────────────────────────────────────── */

interface PhaseDisplay {
  label: string;
  cls: string;
  icon: React.ReactNode;
  step: number; // 0–5 for progress bar
}

function getPhaseDisplay(phase: ShipmentPhase, onHold: boolean): PhaseDisplay {
  if (onHold) {
    return {
      label: "Customs Review",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      icon: <AlertTriangle className="h-3 w-3" />,
      step: 3,
    };
  }
  switch (phase) {
    case "Booked":
      return {
        label: "Booked",
        cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        icon: <Package className="h-3 w-3" />,
        step: 1,
      };
    case "In Transit":
      return {
        label: "In Transit",
        cls: "border-brand/40 bg-brand/10 text-brand",
        icon: <Ship className="h-3 w-3" />,
        step: 2,
      };
    case "Discharged":
      return {
        label: "Discharged",
        cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        icon: <Container className="h-3 w-3" />,
        step: 3,
      };
    case "Customs Hold":
      return {
        label: "Customs Review",
        cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: <AlertTriangle className="h-3 w-3" />,
        step: 3,
      };
    case "Released":
      return {
        label: "Released",
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: <CheckCheck className="h-3 w-3" />,
        step: 4,
      };
    case "Delivered":
      return {
        label: "Delivered",
        cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        icon: <CheckCheck className="h-3 w-3" />,
        step: 5,
      };
  }
}

const PHASE_STEPS = ["Booked", "In Transit", "At Port", "Released", "Delivered"];

/** ETA formatting — returns a human label and urgency signal. */
function formatEta(iso: string): { label: string; urgent: boolean; past: boolean } {
  const eta = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eta.setHours(0, 0, 0, 0);
  const diff = Math.round((eta.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0) {
    return {
      label: eta.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      urgent: false,
      past: true,
    };
  }
  if (diff === 0) return { label: "Today", urgent: true, past: false };
  if (diff === 1) return { label: "Tomorrow", urgent: true, past: false };
  if (diff <= 5) {
    return {
      label: eta.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      urgent: false,
      past: false,
    };
  }
  return {
    label: eta.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    urgent: false,
    past: false,
  };
}

/* ── Filter definition ───────────────────────────────────────────────────── */

type Filter = "all" | "active" | "review" | "delivered";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "review", label: "Customs Review" },
  { id: "delivered", label: "Delivered" },
];

function passesFilter(s: ClientShipment, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "delivered") return s.phase === "Delivered";
  if (f === "review") return s.onCustomsHold || s.phase === "Customs Hold";
  // active = anything not delivered
  return s.phase !== "Delivered";
}

/* ── Shipment Card ───────────────────────────────────────────────────────── */

function ShipmentCard({ shipment }: { shipment: ClientShipment }) {
  const pd = getPhaseDisplay(shipment.phase, shipment.onCustomsHold);
  const eta = formatEta(shipment.eta);
  const isDone = shipment.phase === "Delivered";

  // Mask last 4 chars of container number: MSCU4821033 → MSCU482••••
  const maskedContainer =
    shipment.containerNumber.length > 7
      ? shipment.containerNumber.slice(0, -4) + "••••"
      : shipment.containerNumber;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-premium rounded-2xl p-5 flex flex-col gap-4 transition-opacity",
        isDone && "opacity-70",
      )}
    >
      {/* Row 1: ref + phase badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-[0.95rem] text-foreground">
              {shipment.id}
            </span>
            <span className="text-[0.68rem] text-muted-foreground font-mono">
              B/L {shipment.blNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[0.72rem] text-muted-foreground">
            <span>{shipment.direction}</span>
            <span className="opacity-40">·</span>
            <span>{shipment.containerType}</span>
            <span className="opacity-40">·</span>
            <span className="font-mono text-[0.65rem]">{maskedContainer}</span>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold shrink-0",
            pd.cls,
          )}
        >
          {pd.icon}
          {pd.label}
        </span>
      </div>

      {/* Row 2: route */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">
            {shipment.pol}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground/40">
          <div className="h-px w-8 bg-border" />
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-foreground truncate">
            {shipment.pod}
          </span>
          <MapPin className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        </div>
      </div>

      {/* Row 3: progress steps */}
      <div className="flex items-center gap-1">
        {PHASE_STEPS.map((step, i) => {
          const filled = pd.step > i;
          const active = pd.step === i + 1;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "h-1 w-full rounded-full transition-colors duration-300",
                  filled
                    ? active && shipment.onCustomsHold
                      ? "bg-amber-400"
                      : filled
                        ? "bg-brand"
                        : "bg-border"
                    : "bg-border/50",
                )}
              />
              <span
                className={cn(
                  "text-[0.52rem] font-medium truncate text-center w-full hidden sm:block",
                  active ? "text-foreground" : "text-muted-foreground/40",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Row 4: carrier + ETA */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <Ship className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <div className="min-w-0">
            <span className="text-[0.72rem] font-semibold text-foreground truncate block">
              {shipment.carrier}
            </span>
            <span className="text-[0.65rem] text-muted-foreground truncate block">
              {shipment.vessel}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/55">
            {isDone ? "Delivered" : "ETA"}
          </span>
          <span
            className={cn(
              "text-[0.78rem] font-bold",
              eta.urgent
                ? "text-amber-600 dark:text-amber-400"
                : eta.past
                  ? "text-muted-foreground"
                  : "text-foreground",
            )}
          >
            {eta.label}
          </span>
        </div>
      </div>

      {/* Customs hold notice — no internal reason exposed */}
      {shipment.onCustomsHold && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold text-amber-700 dark:text-amber-300">
              Pending customs clearance
            </p>
            <p className="text-[0.65rem] text-muted-foreground leading-relaxed mt-0.5">
              Your shipment is currently under customs review. Our team is handling
              the documentation. We'll notify you as soon as it is released.
            </p>
          </div>
        </div>
      )}

      {/* View on Map — only for non-delivered shipments */}
      {!isDone && (
        <Link
          to="/portal/tracking"
          search={{ focus: shipment.id }}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border text-[0.72rem] font-semibold transition-colors",
            "border-brand/25 bg-brand/[0.04] text-brand/80",
            "hover:border-brand/50 hover:bg-brand/[0.08] hover:text-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
        >
          <Globe2 className="h-3 w-3" />
          View on Map
        </Link>
      )}
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function PortalShipmentsPage() {
  const { user } = useAuth();

  // Use the authenticated user's ID as the clientId.
  // In demo/bypass mode this is PORTAL_DEMO_CLIENT_ID so mock data shows correctly.
  const clientId = user?.id ?? PORTAL_DEMO_CLIENT_ID;

  const { data, loading, error, reload } = useAsyncData(
    () => getClientShipments(clientId),
    [clientId],
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const shipments = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    let list = shipments.filter((s) => passesFilter(s, filter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.blNumber.toLowerCase().includes(q) ||
          s.pol.toLowerCase().includes(q) ||
          s.pod.toLowerCase().includes(q) ||
          s.vessel.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q),
      );
    }
    return list;
  }, [shipments, filter, search]);

  const counts = useMemo(() => ({
    active: shipments.filter((s) => s.phase !== "Delivered").length,
    review: shipments.filter((s) => s.onCustomsHold || s.phase === "Customs Hold").length,
    delivered: shipments.filter((s) => s.phase === "Delivered").length,
  }), [shipments]);

  /* ── Loading ── */
  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 animate-pulse">
            <Anchor className="h-5 w-5 text-brand" />
          </span>
          <p className="text-sm text-muted-foreground">Loading your shipments…</p>
        </div>
      </PortalLayout>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-semibold text-foreground">
            Could not load shipments
          </p>
          <p className="text-[0.78rem] text-muted-foreground max-w-sm text-center">
            {error.message}
          </p>
          <button
            type="button"
            onClick={reload}
            className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </PortalLayout>
    );
  }

  /* ── Main view ── */
  return (
    <PortalLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 shrink-0">
              <Ship className="h-4.5 w-4.5 text-brand" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                My Shipments
              </h1>
              <p className="text-[0.72rem] text-muted-foreground">
                {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
                {counts.active > 0 && ` · ${counts.active} active`}
                {counts.review > 0 && ` · ${counts.review} in review`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="search"
              placeholder="Search by ref, B/L, route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-foreground/[0.03] text-sm text-foreground placeholder:text-muted-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:border-brand/40 transition-colors"
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? shipments.length
                : f.id === "active"
                  ? counts.active
                  : f.id === "review"
                    ? counts.review
                    : counts.delivered;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
                  active
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border bg-foreground/[0.02] text-muted-foreground hover:text-foreground hover:border-foreground/20",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full text-[0.58rem] font-bold px-1",
                      active
                        ? "bg-brand text-white"
                        : "bg-foreground/10 text-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KPI strip */}
        {counts.active > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiChip
              label="Active shipments"
              value={counts.active}
              sub="in transit or at port"
              color="brand"
            />
            {counts.review > 0 && (
              <KpiChip
                label="Customs review"
                value={counts.review}
                sub="pending clearance"
                color="amber"
              />
            )}
            <KpiChip
              label="Delivered"
              value={counts.delivered}
              sub="this period"
              color="emerald"
            />
          </div>
        )}

        {/* CO₂ footprint — ESG transparency widget */}
        <Co2FootprintWidget compact className="mt-2" />

        {/* Shipment grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground/30">
              <Package className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              {search ? "No results found" : "No shipments in this category"}
            </p>
            <p className="text-[0.78rem] text-muted-foreground text-center max-w-xs">
              {search
                ? `No shipments match "${search}"`
                : "Switch to 'All' to see your full shipment history."}
            </p>
            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="text-[0.72rem] font-semibold text-brand hover:opacity-80 transition-opacity"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}

        {/* Contact footer */}
        <div className="mt-2 flex items-start gap-3 rounded-2xl border border-border/60 bg-foreground/[0.015] px-5 py-4">
          <Clock className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <p className="text-[0.72rem] text-muted-foreground leading-relaxed">
            Shipment data updates every 4 hours. For urgent queries about customs holds
            or delivery issues, contact your Altun Logistics account manager or visit
            the{" "}
            <a
              href="/portal/support"
              className="font-semibold text-brand hover:opacity-80 transition-opacity"
            >
              Support
            </a>{" "}
            page.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

/* ── KPI chip ────────────────────────────────────────────────────────────── */

function KpiChip({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: "brand" | "amber" | "emerald";
}) {
  const cls = {
    brand:
      "border-brand/20 bg-brand/[0.04]",
    amber:
      "border-amber-500/20 bg-amber-500/[0.04]",
    emerald:
      "border-emerald-500/20 bg-emerald-500/[0.04]",
  }[color];

  const numCls = {
    brand: "text-brand",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[color];

  return (
    <div className={cn("rounded-xl border px-4 py-3", cls)}>
      <div className={cn("text-2xl font-display font-bold tabular-nums", numCls)}>
        {value}
      </div>
      <div className="text-[0.72rem] font-semibold text-foreground mt-0.5">{label}</div>
      <div className="text-[0.62rem] text-muted-foreground">{sub}</div>
    </div>
  );
}
