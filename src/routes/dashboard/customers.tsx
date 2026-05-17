import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Mail,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  getOceanShipments,
  getFreeTimeStatus,
  useAsyncData,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useGlobalSearch } from "@/lib/dashboard/search";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/dashboard/customers")({
  head: () => ({
    meta: [{ title: "Customers — Altun Logistics Operations" }],
  }),
  component: CustomersPage,
});

type Urgency = "attention" | "monitor" | "healthy";

interface TraderProfile {
  name: string;
  type: "Importer" | "Exporter";
  contact: string;
  email: string;
  shipments: OceanShipment[];
  activeContainers: number;
  totalTeu: number;
  customsHolds: number;
  atRisk: number;
  urgency: Urgency;
}

const URGENCY_STYLE: Record<Urgency, { chip: string; label: string }> = {
  attention: {
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
    label: "Needs attention",
  },
  monitor: {
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    label: "Monitor",
  },
  healthy: {
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    label: "Healthy",
  },
};

function CustomersPage() {
  const { data, loading, error, reload } = useAsyncData(getOceanShipments, []);
  const { query } = useGlobalSearch();
  const { thresholds } = useDemurrageThresholds();
  const t = useT();

  const rows = useMemo(() => data ?? [], [data]);

  const profiles = useMemo<TraderProfile[]>(() => {
    const byTrader = new Map<string, OceanShipment[]>();
    for (const s of rows) {
      const list = byTrader.get(s.trader) ?? [];
      list.push(s);
      byTrader.set(s.trader, list);
    }
    return [...byTrader.entries()]
      .map(([name, list]) => {
        const active = list.filter((s) => s.phase !== "Delivered");
        const customsHolds = list.filter((s) => s.customsBlock !== null).length;
        const atRisk = active.filter((s) => {
          const r = getFreeTimeStatus(s, thresholds).risk;
          return r === "demurrage" || r === "critical";
        }).length;
        const urgency: Urgency =
          atRisk > 0 || customsHolds > 0
            ? "attention"
            : active.some(
                  (s) => getFreeTimeStatus(s, thresholds).risk === "warning",
                )
              ? "monitor"
              : "healthy";
        return {
          name,
          type: list[0].traderType,
          contact: list[0].traderContact,
          email: list[0].traderEmail,
          shipments: list,
          activeContainers: active.length,
          totalTeu: list.reduce((n, s) => n + s.teu, 0),
          customsHolds,
          atRisk,
          urgency,
        };
      })
      .sort((a, b) => b.totalTeu - a.totalTeu);
  }, [rows, thresholds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [profiles, query]);

  const header = (
    <div className="mb-5">
      <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
        {t("page.customers.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("page.customers.sub")}
      </p>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading trader profiles…" />
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState error={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {header}

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        {query.trim() && <Search className="h-3.5 w-3.5 text-brand" />}
        <span className="font-semibold text-foreground tabular-nums">
          {filtered.length}
        </span>
        {t("common.results")}
      </div>

      <div className="max-h-[calc(100vh-17rem)] overflow-y-auto scroll-thin pr-1">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <TraderCard key={p.name} p={p} index={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("common.noMatches")}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

function TraderCard({ p, index }: { p: TraderProfile; index: number }) {
  const urgency = URGENCY_STYLE[p.urgency];
  const Dir = p.type === "Importer" ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="card-premium rounded-2xl p-4 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-foreground text-[0.95rem] tracking-tight truncate">
            {p.name}
          </h3>
          <span className="mt-1 inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-brand">
            <Dir className="h-3 w-3" />
            {p.type}
          </span>
        </div>
        <span
          className={cn(
            "inline-block rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold shrink-0",
            urgency.chip,
          )}
        >
          {urgency.label}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <User className="h-3 w-3" />
          {p.contact}
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <Mail className="h-3 w-3" />
          {p.email}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat
          label="Active"
          value={p.activeContainers}
          icon={<Box className="h-3 w-3" />}
        />
        <Stat label="Total TEU" value={p.totalTeu} />
        <Stat
          label="Holds"
          value={p.customsHolds}
          danger={p.customsHolds > 0}
        />
      </div>
    </motion.article>
  );
}

function Stat({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.03] p-2.5">
      <p className="flex items-center gap-1 text-[0.58rem] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-lg font-bold tabular-nums",
          danger ? "text-rose-600 dark:text-rose-400" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
