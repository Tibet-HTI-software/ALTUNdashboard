import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ship,
  Stamp,
  Warehouse,
  CheckCircle2,
  FileText,
  ArrowRight,
  Truck,
  Building2,
  Radar,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { demoAction } from "@/lib/dashboard/demo";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import { ChartCard, BarChart } from "@/components/dashboard/ChartCard";
import {
  StatusBadge,
  shipmentStatusTone,
  priorityTone,
} from "@/components/dashboard/StatusBadge";
import { getDashboardOverview, useAsyncData } from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { formatDateShort } from "@/lib/dashboard/format";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Overview — Altun Logistics Operations" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data, loading, error, reload } = useAsyncData(
    getDashboardOverview,
    [],
  );

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Operations Overview"
          description="Live snapshot of shipments, customs, warehouse and quotes."
        />
        <LoadingState label="Loading operations overview…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Operations Overview"
          description="Live snapshot of shipments, customs, warehouse and quotes."
        />
        <ErrorState
          error={error ?? new Error("Overview unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const {
    shipments,
    weeklyShipmentTrend,
    customsFiles,
    warehouseZones,
    quotes,
  } = data;

  const activeShipments = shipments.filter(
    (s) => s.status !== "Delivered",
  ).length;
  const inTransit = shipments.filter((s) => s.status === "In Transit").length;
  const delayed = shipments.filter((s) => s.status === "Delayed").length;
  const pendingCustoms = customsFiles.filter(
    (c) => c.stage !== "Released",
  ).length;
  const totalCapacity = warehouseZones.reduce((s, z) => s + z.capacity, 0);
  const usedCapacity = warehouseZones.reduce((s, z) => s + z.used, 0);
  const occupancy = usedCapacity / totalCapacity;
  const openQuotes = quotes.filter(
    (q) => q.status === "New" || q.status === "Reviewing",
  ).length;
  const onTime = 0.94;

  const recentShipments = shipments.slice(0, 5);
  const recentQuotes = quotes.slice(0, 5);
  const weekTotal = weeklyShipmentTrend.reduce((s, d) => s + d.shipments, 0);

  return (
    <DashboardLayout>
      {/* ── Hero / status banner ─────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hero-gradient glow-brand relative overflow-hidden rounded-2xl border border-border p-6 sm:p-8"
      >
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 h-7 text-[0.7rem] font-semibold text-brand">
              <Radar className="h-3.5 w-3.5" />
              Operations Control Center
            </span>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.1]">
              Operations Overview
            </h1>
            <p className="mt-2.5 text-sm sm:text-[0.95rem] text-muted-foreground max-w-xl leading-relaxed">
              {activeShipments} shipments in motion · {inTransit} in transit ·{" "}
              {delayed} delayed · {pendingCustoms} customs files awaiting
              clearance.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard/shipments"
                className="inline-flex items-center gap-1.5 h-10 rounded-xl bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_6px_18px_-8px_var(--brand)]"
              >
                View shipments <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  demoAction("this would open the new shipment form.")
                }
                className="inline-flex items-center gap-1.5 h-10 rounded-xl border border-border bg-foreground/[0.04] text-foreground px-4 text-sm font-semibold hover:bg-foreground/[0.08] transition-colors"
              >
                <Plus className="h-4 w-4" /> New shipment
              </button>
            </div>
          </div>

          {/* Hero stat trio */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            {[
              { label: "On-time", value: `${(onTime * 100).toFixed(0)}%` },
              { label: "Capacity", value: `${(occupancy * 100).toFixed(0)}%` },
              { label: "Open quotes", value: openQuotes },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-center min-w-[5.5rem]"
              >
                <div className="font-display text-xl font-bold text-foreground tabular-nums">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[0.62rem] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── KPIs (clickable → section) ───────────────────────────── */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPIStatCard
          index={0}
          label="Active Shipments"
          value={activeShipments}
          icon={Ship}
          delta={{ value: "+8% wk", positive: true }}
          hint="Open shipments"
          to="/dashboard/shipments"
        />
        <KPIStatCard
          index={1}
          label="Pending Customs"
          value={pendingCustoms}
          icon={Stamp}
          hint="Files to clear"
          to="/dashboard/customs"
        />
        <KPIStatCard
          index={2}
          label="Warehouse Use"
          value={`${(occupancy * 100).toFixed(0)}%`}
          icon={Warehouse}
          hint="Zone capacity"
          progress={occupancy}
          to="/dashboard/warehouse"
        />
        <KPIStatCard
          index={3}
          label="On-Time Delivery"
          value={`${(onTime * 100).toFixed(0)}%`}
          icon={CheckCircle2}
          delta={{ value: "+1.2pp", positive: true }}
          progress={onTime}
          to="/dashboard/reports"
        />
        <KPIStatCard
          index={4}
          label="Open Quotes"
          value={openQuotes}
          icon={FileText}
          hint="New + reviewing"
          to="/dashboard/quotes"
        />
      </div>

      {/* ── Weekly trend ─────────────────────────────────────────── */}
      <div className="mt-8">
        <ChartCard
          title="Weekly Shipment Trend"
          description={`Bookings created per day · ${weekTotal} this week`}
          action={
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-brand" aria-hidden />
              Bookings
            </span>
          }
        >
          <BarChart
            data={weeklyShipmentTrend.map((d) => ({
              label: d.day,
              value: d.shipments,
            }))}
            height={200}
          />
        </ChartCard>
      </div>

      {/* ── Two preview lists ────────────────────────────────────── */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Active shipments */}
        <section className="card-premium rounded-2xl">
          <header className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="font-display font-semibold text-foreground text-base tracking-tight">
                Active Shipments
              </h3>
              <p className="text-xs text-muted-foreground">
                Latest 5 in motion
              </p>
            </div>
            <Link
              to="/dashboard/shipments"
              className="text-xs font-semibold text-brand hover:underline underline-offset-4"
            >
              View all →
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {recentShipments.map((s) => (
              <li key={s.id}>
                <Link
                  to="/dashboard/shipments/$id"
                  params={{ id: s.id }}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-foreground/[0.03] transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-brand/12 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                    {s.mode === "Sea" ? (
                      <Ship className="h-4 w-4" />
                    ) : s.mode === "Rail" ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {s.id}
                      </span>
                      <StatusBadge tone={shipmentStatusTone(s.status)}>
                        {s.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.customer}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.origin} → {s.destination} · ETA{" "}
                      {formatDateShort(s.eta)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent quotes */}
        <section className="card-premium rounded-2xl">
          <header className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="font-display font-semibold text-foreground text-base tracking-tight">
                Recent Quote Requests
              </h3>
              <p className="text-xs text-muted-foreground">New + reviewing</p>
            </div>
            <Link
              to="/dashboard/quotes"
              className="text-xs font-semibold text-brand hover:underline underline-offset-4"
            >
              View all →
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {recentQuotes.map((q) => (
              <li key={q.id}>
                <Link
                  to="/dashboard/quotes"
                  className="px-5 py-3 flex items-center gap-3 flex-wrap hover:bg-foreground/[0.03] transition-colors"
                >
                  <span className="font-mono text-xs font-semibold text-foreground shrink-0">
                    {q.id}
                  </span>
                  <span className="text-sm text-foreground font-medium flex-1 min-w-[140px] truncate">
                    {q.customer}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    {q.origin} → {q.destination}
                  </span>
                  <StatusBadge tone={priorityTone(q.urgency)}>
                    {q.urgency}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
