import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Container,
  CheckCircle2,
  Stamp,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  Globe2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import { ChartCard, ProgressRow } from "@/components/dashboard/ChartCard";
import { CeoTrendChart } from "@/components/dashboard/CeoTrendChart";
import { FleetGlobe, type GlobeArc } from "@/components/dashboard/FleetGlobe";
import { DemurrageRiskBoard } from "@/components/dashboard/DemurrageRiskBoard";
import { CustomsActionCenter } from "@/components/dashboard/CustomsActionCenter";
import { CommunicationHub } from "@/components/dashboard/CommunicationHub";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  getOceanShipments,
  getCustomerEmails,
  getCeoSnapshot,
  useAsyncData,
  type OceanShipment,
  type CustomerEmail,
  type CeoSnapshot,
} from "@/lib/dashboard/api";
import { portCoord } from "@/data/dashboard/ports";
import { useRole } from "@/lib/dashboard/role";
import { useT, type I18nKey } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Overview — Altun Logistics Operations" }],
  }),
  component: OverviewPage,
});

interface OverviewData {
  shipments: OceanShipment[];
  emails: CustomerEmail[];
  ceo: CeoSnapshot;
}

/** Single combined fetch — all role views read from this dual-mode service. */
async function loadOceanOverview(): Promise<OverviewData> {
  const [shipments, emails, ceo] = await Promise.all([
    getOceanShipments(),
    getCustomerEmails(),
    getCeoSnapshot(),
  ]);
  return { shipments, emails, ceo };
}

const eur = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

/** Maps each role to its board heading + subtitle i18n keys. */
const ROLE_COPY: Record<string, { title: I18nKey; subtitle: I18nKey }> = {
  ceo: { title: "ceo.title", subtitle: "ceo.subtitle" },
  planner: { title: "planner.title", subtitle: "planner.subtitle" },
  customs: { title: "customs.title", subtitle: "customs.subtitle" },
  service: { title: "service.title", subtitle: "service.subtitle" },
};

function OverviewPage() {
  const { data, loading, error, reload } = useAsyncData(loadOceanOverview, []);
  const { role } = useRole();
  const t = useT();
  const copy = ROLE_COPY[role];

  if (loading) {
    return (
      <DashboardLayout lockViewport>
        <LoadingState label="Loading operations overview…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout lockViewport>
        <ErrorState
          error={error ?? new Error("Overview unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const { shipments, emails, ceo } = data;

  return (
    <DashboardLayout lockViewport>
      {/* ── Minimal header ──────────────────────────────────────── */}
      <div className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          {t(copy.title)}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t(copy.subtitle)}
        </p>
      </div>

      {/* ── Shared KPI row ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        <KPIStatCard
          index={0}
          label="Active Containers"
          value={ceo.activeContainers}
          icon={Container}
          hint="TEU currently in motion"
        />
        <KPIStatCard
          index={1}
          label="On-Time Delivery"
          value={`${(ceo.onTimePct * 100).toFixed(0)}%`}
          icon={CheckCircle2}
          progress={ceo.onTimePct}
          delta={{ value: "+1.2pp", positive: true }}
        />
        <KPIStatCard
          index={2}
          label="Customs Holds"
          value={ceo.customsHolds}
          icon={Stamp}
          hint="Declarations blocked"
        />
        <KPIStatCard
          index={3}
          label="Demurrage Exposure"
          value={eur(ceo.demurrageExposureEur)}
          icon={Wallet}
          hint="Accrued D&D fines"
        />
      </div>

      {/* ── Role board ──────────────────────────────────────────── */}
      <motion.div
        layout
        key={role}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scroll-thin pr-1"
      >
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
            {t(copy.title)}
          </h2>
          <p className="text-sm text-muted-foreground">{t(copy.subtitle)}</p>
        </div>

        {role === "ceo" && <CeoBoard ceo={ceo} shipments={shipments} />}
        {role === "planner" && <DemurrageRiskBoard shipments={shipments} />}
        {role === "customs" && <CustomsActionCenter shipments={shipments} />}
        {role === "service" && <CommunicationHub emails={emails} />}
      </motion.div>
    </DashboardLayout>
  );
}

/** CEO / Management board — trend chart, fleet split, fleet-globe teaser. */
function CeoBoard({
  ceo,
  shipments,
}: {
  ceo: CeoSnapshot;
  shipments: OceanShipment[];
}) {
  const total = ceo.importCount + ceo.exportCount || 1;
  const weekBookings = ceo.trend.reduce((s, d) => s + d.bookings, 0);

  // Trade-route arcs for the teaser globe.
  const arcs: GlobeArc[] = shipments.slice(0, 9).map((s) => {
    const a = portCoord(s.pol);
    const b = portCoord(s.pod);
    return {
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
    };
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Weekly Booking Trend"
          description={`Bookings vs deliveries · ${weekBookings} booked this week`}
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand" aria-hidden />
                Bookings
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm bg-[oklch(0.68_0.13_195)]"
                  aria-hidden
                />
                Delivered
              </span>
            </div>
          }
        >
          <CeoTrendChart data={ceo.trend} />
        </ChartCard>

        <ChartCard title="Trade Direction" description="Import vs export split">
          <div className="space-y-4">
            <ProgressRow
              label="Import"
              value={ceo.importCount / total}
              meta={`${ceo.importCount} shipments`}
              tone="brand"
            />
            <ProgressRow
              label="Export"
              value={ceo.exportCount / total}
              meta={`${ceo.exportCount} shipments`}
              tone="navy"
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-border bg-foreground/[0.03] p-3">
                <ArrowDownToLine className="h-4 w-4 text-brand" />
                <p className="mt-1.5 font-display text-xl font-bold text-foreground tabular-nums">
                  {ceo.importCount}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  Import bookings
                </p>
              </div>
              <div className="rounded-xl border border-border bg-foreground/[0.03] p-3">
                <ArrowUpFromLine className="h-4 w-4 text-brand" />
                <p className="mt-1.5 font-display text-xl font-bold text-foreground tabular-nums">
                  {ceo.exportCount}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  Export bookings
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Live Fleet Tracking teaser — whole card routes to the globe page */}
      <Link
        to="/dashboard/fleet-tracking"
        className="group relative block overflow-hidden rounded-2xl card-premium hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground tracking-tight">
              <Globe2 className="h-4 w-4 text-brand" />
              Live Fleet Tracking
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open the interactive 3D fleet command globe
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-brand">
            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        <div className="mt-1 h-56">
          <FleetGlobe arcs={arcs} interactive={false} autoRotate />
        </div>
      </Link>
    </div>
  );
}
