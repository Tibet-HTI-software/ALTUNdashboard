import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Container,
  CheckCircle2,
  Stamp,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  Globe2,
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import { ChartCard, ProgressRow } from "@/components/dashboard/ChartCard";
import { CeoTrendChart } from "@/components/dashboard/CeoTrendChart";
import { FleetGlobe, type GlobeArc } from "@/components/dashboard/FleetGlobe";
import { DemurrageRiskBoard } from "@/components/dashboard/DemurrageRiskBoard";
import { CustomsActionCenter } from "@/components/dashboard/CustomsActionCenter";
import { CommunicationHub } from "@/components/dashboard/CommunicationHub";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { Co2FootprintWidget } from "@/components/dashboard/Co2FootprintWidget";
import { ExceptionAlertCenter } from "@/components/dashboard/ExceptionAlertCenter";
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
  ceo:          { title: "ceo.title",          subtitle: "ceo.subtitle" },
  forwarder:    { title: "forwarder.title",    subtitle: "forwarder.subtitle" },
  ops_manager:  { title: "ops_manager.title",  subtitle: "ops_manager.subtitle" },
  sales_manager:{ title: "sales_manager.title",subtitle: "sales_manager.subtitle" },
  inside_sales: { title: "inside_sales.title", subtitle: "inside_sales.subtitle" },
};

function OverviewPage() {
  const { data, loading, error, reload } = useAsyncData(loadOceanOverview, []);
  const { role } = useRole();
  const t = useT();
  // "client" role has no dashboard board — fall back to CEO view so a direct
  // navigation to /dashboard while role=client never crashes on copy.title.
  const copy = ROLE_COPY[role] ?? ROLE_COPY.ceo;

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

        {/* Exception alert strip — forwarder and ops_manager */}
        {(role === "forwarder" || role === "ops_manager") && (
          <ExceptionAlertCenter shipments={shipments} className="mb-5" />
        )}

        {role === "ceo"          && <CeoBoard ceo={ceo} shipments={shipments} />}
        {role === "ops_manager"  && <DemurrageRiskBoard shipments={shipments} />}
        {role === "forwarder"    && <CustomsActionCenter shipments={shipments} />}
        {role === "inside_sales" && <CommunicationHub emails={emails} />}
        {role === "sales_manager"&& <CeoBoard ceo={ceo} shipments={shipments} />}
      </motion.div>
    </DashboardLayout>
  );
}

/* ── EOM Report card ─────────────────────────────────────────────────────── */

const EOM_STEPS = [
  { label: "Aggregating shipment KPIs", pct: 0.22 },
  { label: "Compiling invoice ledger", pct: 0.44 },
  { label: "Calculating D&D exposure", pct: 0.66 },
  { label: "Rendering executive summary", pct: 0.88 },
  { label: "Packaging report bundle", pct: 1 },
];

function EomReportCard() {
  const [state, setState] = useState<"idle" | "processing" | "done">("idle");
  const [step, setStep] = useState(0);

  function handleGenerate() {
    setState("processing");
    setStep(0);
    EOM_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setStep(i);
        if (i === EOM_STEPS.length - 1) {
          setTimeout(() => {
            setState("done");
            toast.success("EOM Report ready", {
              description: "May 2026 bundle — 4 sections, 12 charts — sent to your inbox.",
            });
          }, 600);
        }
      }, i * 480);
    });
  }

  function handleReset() {
    setState("idle");
    setStep(0);
  }

  const currentStep = EOM_STEPS[step];

  return (
    <div className="card-premium rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
            <BarChart3 className="h-4 w-4 text-violet-500" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              End-of-Month Report
            </h3>
            <p className="text-[0.68rem] text-muted-foreground">
              May 2026 · Full operations &amp; finance bundle
            </p>
          </div>
        </div>
        {state === "done" && (
          <motion.button
            type="button"
            onClick={handleReset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[0.68rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { icon: FileSpreadsheet, label: "Shipment summary", color: "text-sky-500" },
                { icon: Wallet, label: "Invoice ledger", color: "text-emerald-500" },
                { icon: Stamp, label: "Customs KPIs", color: "text-amber-500" },
                { icon: BarChart3, label: "D&D analysis", color: "text-rose-500" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="rounded-xl border border-border bg-foreground/[0.02] p-3 flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <span className="text-[0.65rem] font-medium text-muted-foreground leading-tight">{label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors shadow-[0_6px_18px_-8px_oklch(0.59_0.2_293)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <BarChart3 className="h-4 w-4" />
              Generate EOM Report
            </button>
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin shrink-0" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={step}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="text-xs font-medium text-foreground"
                >
                  {currentStep.label}…
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full bg-violet-500"
                animate={{ width: `${currentStep.pct * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[0.62rem] text-muted-foreground tabular-nums">
              <span>Step {step + 1} / {EOM_STEPS.length}</span>
              <span>{Math.round(currentStep.pct * 100)}%</span>
            </div>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Report ready</p>
                <p className="text-[0.62rem] text-muted-foreground">May 2026 · 4 sections · sent to inbox</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toast.success("Downloading report…", { description: "altun-eom-may-2026.pdf" })}
              className="inline-flex items-center gap-1 h-7 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 text-[0.68rem] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/[0.15] transition-colors"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

      {/* CO₂ / Carbon Footprint tracker */}
      <Co2FootprintWidget />

      {/* EOM Report generator */}
      <EomReportCard />

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
