import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  Check,
  ChevronLeft,
  CircleDot,
  FileSearch,
  Navigation,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  getOceanShipments,
  useAsyncData,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute(
  "/dashboard/automation/document-completeness",
)({
  head: () => ({
    meta: [{ title: "Document Completeness — Altun Logistics" }],
  }),
  component: DocumentCompletenessPage,
});

const BRAND = "oklch(0.52 0.18 254)";

/** Deterministic AI confidence score per shipment. */
function confidence(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 84 + (h % 15);
}

function DocumentCompletenessPage() {
  const { data, loading, error, reload } = useAsyncData(getOceanShipments, []);
  const t = useT();

  const header = (
    <div className="mb-5">
      <Link
        to="/dashboard/automation"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand transition-colors mb-3"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t("auto.title")}
      </Link>
      <div className="flex items-center gap-3">
        <motion.span
          layoutId="wf-icon-docs"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_18px_-6px_var(--brand)]"
        >
          <FileSearch className="h-5 w-5 text-brand" />
        </motion.span>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            {t("auto.wf.docs")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auto.wf.docs.desc")}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Scanning booking files…" />
      </DashboardLayout>
    );
  }
  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {header}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("auto.panel.map")} icon={Navigation}>
          <VesselMap shipments={data} />
        </Panel>
        <Panel title={t("auto.panel.exceptions")} icon={FileSearch}>
          <ExceptionTable shipments={data} />
        </Panel>
        <Panel title={t("auto.panel.timeline")} icon={CircleDot}>
          <MilestoneTimeline shipments={data} />
        </Panel>
        <Panel title={t("auto.panel.usage")} icon={Ship}>
          <UsageAndControls />
        </Panel>
      </div>
    </DashboardLayout>
  );
}

/* ── Panel shell ──────────────────────────────────────────── */

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Ship;
  children: React.ReactNode;
}) {
  return (
    <section className="card-premium rounded-2xl flex flex-col dark:shadow-[0_0_22px_-14px_var(--brand)]">
      <header className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
        <Icon className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </section>
  );
}

/* ── Vessel position map (stylised SVG) ───────────────────── */

function VesselMap({ shipments }: { shipments: OceanShipment[] }) {
  // Place each in-transit / discharged vessel along a pseudo route lane.
  const vessels = shipments
    .filter((s) => s.phase !== "Delivered")
    .slice(0, 9)
    .map((s, i) => {
      const progress =
        s.phase === "Booked" ? 0.08 : s.phase === "In Transit" ? 0.5 : 0.92;
      return {
        id: s.id,
        x: 12 + progress * 76,
        y: 16 + (i % 9) * 8.4,
        risk: s.customsBlock !== null,
        label: s.containerNumber,
      };
    });

  return (
    <div className="relative h-[200px] rounded-xl overflow-hidden border border-border bg-[oklch(0.95_0.02_240)] dark:bg-[oklch(0.2_0.03_250)]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* lane guides */}
        {[...Array(9)].map((_, i) => (
          <line
            key={i}
            x1="12"
            y1={16 + i * 8.4}
            x2="88"
            y2={16 + i * 8.4}
            stroke={BRAND}
            strokeWidth="0.3"
            strokeDasharray="1.5 1.5"
            opacity="0.25"
          />
        ))}
        {/* port nodes */}
        <circle cx="12" cy="50" r="2.2" fill={BRAND} opacity="0.7" />
        <circle cx="88" cy="50" r="2.2" fill={BRAND} opacity="0.7" />
        {/* vessels */}
        {vessels.map((v) => (
          <g key={v.id}>
            <circle
              cx={v.x}
              cy={v.y}
              r="2.6"
              fill={v.risk ? "oklch(0.62 0.2 18)" : BRAND}
              opacity="0.9"
            >
              <animate
                attributeName="r"
                values="2.6;3.4;2.6"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>
      <div className="absolute left-2 top-2 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Loading port
      </div>
      <div className="absolute right-2 top-2 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Discharge port
      </div>
      <div className="absolute left-2 bottom-2 flex items-center gap-3 text-[0.6rem] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand" /> On track
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Doc exception
        </span>
      </div>
    </div>
  );
}

/* ── Exception table ──────────────────────────────────────── */

function ExceptionTable({ shipments }: { shipments: OceanShipment[] }) {
  const t = useT();
  const exceptions = shipments.filter((s) => s.customsBlock !== null);

  return (
    <div className="max-h-[200px] overflow-y-auto scroll-thin">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            <th className="text-left py-1.5 pr-2">{t("col.container")}</th>
            <th className="text-left py-1.5 pr-2">Missing document</th>
            <th className="text-right py-1.5">{t("auto.confidence")}</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.map((s) => {
            const conf = confidence(s.id);
            return (
              <tr
                key={s.id}
                className="border-b border-border/60 last:border-0"
              >
                <td className="py-2 pr-2 font-mono font-semibold text-foreground">
                  {s.containerNumber}
                </td>
                <td className="py-2 pr-2 text-amber-700 dark:text-amber-300">
                  {s.customsBlock}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={cn(
                      "inline-block rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
                      conf >= 92
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {conf}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {exceptions.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No document exceptions — every file is complete.
        </p>
      )}
    </div>
  );
}

/* ── Process milestone timeline ───────────────────────────── */

function MilestoneTimeline({ shipments }: { shipments: OceanShipment[] }) {
  const exceptions = shipments.filter((s) => s.customsBlock !== null).length;
  const steps = [
    { label: "Booking files ingested", count: shipments.length, done: true },
    { label: "Documents OCR-scanned", count: 38, done: true },
    { label: "Exceptions detected", count: exceptions, done: true },
    { label: "Exporters notified", count: exceptions, active: true },
    { label: "Declarations lodged", count: 0, done: false },
  ];
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border shrink-0",
                s.done
                  ? "bg-brand border-brand text-white"
                  : s.active
                    ? "border-brand text-brand"
                    : "border-border text-muted-foreground",
              )}
            >
              {s.done ? (
                <Check className="h-3 w-3" />
              ) : (
                <CircleDot className="h-3 w-3" />
              )}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "w-px flex-1 my-0.5",
                  s.done ? "bg-brand/40" : "bg-border",
                )}
              />
            )}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">
              {s.count} {s.count === 1 ? "item" : "items"}
              {s.active && " · in progress"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Usage chart + control panel ──────────────────────────── */

const USAGE = [
  { day: "Mon", scanned: 28 },
  { day: "Tue", scanned: 41 },
  { day: "Wed", scanned: 33 },
  { day: "Thu", scanned: 47 },
  { day: "Fri", scanned: 38 },
  { day: "Sat", scanned: 12 },
  { day: "Sun", scanned: 9 },
];

const RULES = [
  "Auto-scan new booking files",
  "Email exporter on missing document",
  "Escalate if unresolved after 24h",
  "Pre-lodge declaration when complete",
];

function UsageAndControls() {
  const t = useT();
  const [rules, setRules] = useState([true, true, true, false]);

  return (
    <div className="space-y-3">
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={USAGE}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="usage-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <Tooltip
              cursor={{ stroke: BRAND, strokeOpacity: 0.2 }}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Area
              type="monotone"
              dataKey="scanned"
              stroke={BRAND}
              strokeWidth={2}
              fill="url(#usage-grad)"
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t("auto.panel.controls")}
        </p>
        <ul className="space-y-1.5">
          {RULES.map((rule, i) => (
            <li key={rule}>
              <button
                type="button"
                onClick={() =>
                  setRules((r) => r.map((v, j) => (j === i ? !v : v)))
                }
                aria-pressed={rules[i]}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-left hover:border-brand/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-xs text-foreground">{rule}</span>
                <span
                  className={cn(
                    "relative h-4 w-7 rounded-full transition-colors shrink-0",
                    rules[i] ? "bg-brand" : "bg-foreground/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                      rules[i] ? "left-[0.875rem]" : "left-0.5",
                    )}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
