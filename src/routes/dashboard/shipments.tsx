import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Container as ContainerIcon, Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { demoSuccess } from "@/lib/dashboard/demo";
import {
  getOceanShipments,
  getFreeTimeStatus,
  useAsyncData,
  type OceanShipment,
  type ShipmentPhase,
} from "@/lib/dashboard/api";
import { useGlobalSearch } from "@/lib/dashboard/search";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { useRole } from "@/lib/dashboard/role";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/dashboard/shipments")({
  head: () => ({
    meta: [{ title: "Shipments — Altun Logistics Operations" }],
  }),
  component: ShipmentsPage,
});

const PHASE_TONE: Record<ShipmentPhase, string> = {
  Booked: "bg-foreground/[0.06] text-muted-foreground border-border",
  "In Transit":
    "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
  Discharged:
    "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
  "Customs Hold":
    "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  Released: "bg-brand/12 text-brand border-brand/25",
  Delivered:
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
};

const RISK_CHIP: Record<string, string> = {
  demurrage: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  critical: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  healthy: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

type SortKey =
  | "containerNumber"
  | "carrier"
  | "phase"
  | "pod"
  | "trader"
  | "freeTime";

function ShipmentsPage() {
  const { data, loading, error, reload } = useAsyncData(getOceanShipments, []);
  const { query } = useGlobalSearch();
  const { thresholds } = useDemurrageThresholds();
  const { role } = useRole();
  const t = useT();

  const [carrier, setCarrier] = useState("all");
  const [phase, setPhase] = useState("all");
  const [pod, setPod] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "freeTime",
    dir: 1,
  });

  // Customs Declarant lands on blocked shipments first.
  useEffect(() => {
    if (role === "customs") setPhase("Customs Hold");
  }, [role]);

  const rows = useMemo(() => data ?? [], [data]);

  const carriers = useMemo(
    () => [...new Set(rows.map((s) => s.carrier))].sort(),
    [rows],
  );
  const pods = useMemo(
    () => [...new Set(rows.map((s) => s.pod))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = rows.filter((s) => {
      if (carrier !== "all" && s.carrier !== carrier) return false;
      if (phase !== "all" && s.phase !== phase) return false;
      if (pod !== "all" && s.pod !== pod) return false;
      if (!q) return true;
      return (
        s.containerNumber.toLowerCase().includes(q) ||
        s.blNumber.toLowerCase().includes(q) ||
        s.vessel.toLowerCase().includes(q) ||
        s.trader.toLowerCase().includes(q) ||
        s.pol.toLowerCase().includes(q) ||
        s.pod.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
    const sorted = [...matches].sort((a, b) => {
      if (sort.key === "freeTime") {
        return (
          (getFreeTimeStatus(a, thresholds).hoursLeft -
            getFreeTimeStatus(b, thresholds).hoursLeft) *
          sort.dir
        );
      }
      return String(a[sort.key]).localeCompare(String(b[sort.key])) * sort.dir;
    });
    return sorted;
  }, [rows, query, carrier, phase, pod, sort, thresholds]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 },
    );
  }

  const header = (
    <div className="mb-5">
      <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
        {t("page.shipments.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("page.shipments.sub")}
      </p>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading ocean freight shipments…" />
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <FilterSelect
          label={t("filter.carrier")}
          value={carrier}
          onChange={setCarrier}
          options={carriers}
          allLabel={t("filter.all")}
        />
        <FilterSelect
          label={t("filter.status")}
          value={phase}
          onChange={setPhase}
          options={[
            "Booked",
            "In Transit",
            "Discharged",
            "Customs Hold",
            "Released",
            "Delivered",
          ]}
          allLabel={t("filter.all")}
        />
        <FilterSelect
          label={t("filter.port")}
          value={pod}
          onChange={setPod}
          options={pods}
          allLabel={t("filter.all")}
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {query.trim() && <Search className="h-3.5 w-3.5 text-brand" />}
          <span className="font-semibold text-foreground tabular-nums">
            {filtered.length}
          </span>
          {t("common.results")}
        </span>
      </div>

      {/* Table card — internal scroll keeps the page itself static */}
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="max-h-[calc(100vh-19rem)] overflow-y-auto scroll-thin">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="border-b border-border">
                <SortHead
                  label={t("col.container")}
                  active={sort.key === "containerNumber"}
                  dir={sort.dir}
                  onClick={() => toggleSort("containerNumber")}
                />
                <SortHead
                  label={t("col.route")}
                  active={sort.key === "pod"}
                  dir={sort.dir}
                  onClick={() => toggleSort("pod")}
                />
                <SortHead
                  label={t("col.carrier")}
                  active={sort.key === "carrier"}
                  dir={sort.dir}
                  onClick={() => toggleSort("carrier")}
                />
                <th className="px-3 py-2.5 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("col.vessel")}
                </th>
                <SortHead
                  label={t("col.trader")}
                  active={sort.key === "trader"}
                  dir={sort.dir}
                  onClick={() => toggleSort("trader")}
                />
                <SortHead
                  label={t("col.status")}
                  active={sort.key === "phase"}
                  dir={sort.dir}
                  onClick={() => toggleSort("phase")}
                />
                <SortHead
                  label={t("col.freeTime")}
                  active={sort.key === "freeTime"}
                  dir={sort.dir}
                  onClick={() => toggleSort("freeTime")}
                  alignRight
                />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <Row key={s.id} s={s} index={i} thresholds={thresholds} />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              title="No shipments found"
              description="No sea-freight bookings match the current filters — adjust them or create a new shipment."
              actionLabel="Create Shipment"
              onAction={() =>
                demoSuccess("New shipment", "This would open the booking form.")
              }
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({
  s,
  index,
  thresholds,
}: {
  s: OceanShipment;
  index: number;
  thresholds: { criticalH: number; warningH: number };
}) {
  const ft = getFreeTimeStatus(s, thresholds);
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.3) }}
      className="border-b border-border/70 last:border-0 hover:bg-foreground/[0.03] transition-colors"
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ContainerIcon className="h-3.5 w-3.5 text-brand shrink-0" />
          <span className="font-mono text-xs font-semibold text-foreground">
            {s.containerNumber}
          </span>
        </div>
        <span className="text-[0.65rem] text-muted-foreground">
          {s.containerType} · {s.direction}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
        {s.pol} → {s.pod}
      </td>
      <td className="px-3 py-2.5 text-xs text-foreground">{s.carrier}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {s.vessel}
        <span className="block text-[0.65rem]">{s.voyage}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-foreground max-w-[12rem] truncate">
        {s.trader}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "inline-block rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold",
            PHASE_TONE[s.phase],
          )}
        >
          {s.phase}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span
          className={cn(
            "inline-block rounded-md px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap",
            RISK_CHIP[ft.risk],
          )}
        >
          {ft.label}
        </span>
      </td>
    </motion.tr>
  );
}

function SortHead({
  label,
  active,
  dir,
  onClick,
  alignRight,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
  alignRight?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[0.62rem] font-semibold uppercase tracking-wider",
        alignRight ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded",
          active ? "text-brand" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <ArrowUpDown
          className={cn("h-3 w-3", active && dir === -1 && "rotate-180")}
        />
      </button>
    </th>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-foreground/[0.03] px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
