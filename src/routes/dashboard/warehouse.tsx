import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Info,
  Plus,
  ShieldAlert,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ChartCard, ProgressRow } from "@/components/dashboard/ChartCard";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/dashboard/StatusBadge";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { getWarehouseOverview, useAsyncData } from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import type { HandlingJob } from "@/lib/dashboard/types";
import { demoAction } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/warehouse")({
  head: () => ({
    meta: [{ title: "Warehouse & Operations — Altun Logistics" }],
  }),
  component: WarehousePage,
});

const jobStatusTone: Record<HandlingJob["status"], StatusTone> = {
  Scheduled: "info",
  "In Progress": "brand",
  Completed: "success",
  Delayed: "danger",
};

const jobTypeTone: Record<HandlingJob["type"], StatusTone> = {
  Inbound: "info",
  Outbound: "brand",
  "Cross-dock": "warning",
  Picking: "neutral",
};

function WarehousePage() {
  const { data, loading, error, reload } = useAsyncData(
    getWarehouseOverview,
    [],
  );

  const header = (
    <DashboardPageHeader
      title="Warehouse & Operations"
      description="Zone occupancy, flow, and active handling jobs."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Warehouse" },
      ]}
      actions={
        <button
          type="button"
          onClick={() => demoAction("this would open the schedule-job form.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-brand text-white px-3.5 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)]"
        >
          <Plus className="h-3.5 w-3.5" /> Schedule job
        </button>
      }
    />
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading warehouse overview…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Warehouse data unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const {
    zones: warehouseZones,
    inboundOutbound,
    jobs: handlingJobs,
    alerts: warehouseAlerts,
  } = data;

  const totalCapacity = warehouseZones.reduce((s, z) => s + z.capacity, 0);
  const totalUsed = warehouseZones.reduce((s, z) => s + z.used, 0);
  const occupancy = totalUsed / totalCapacity;
  const totalInbound = inboundOutbound.reduce((s, d) => s + d.inbound, 0);
  const totalOutbound = inboundOutbound.reduce((s, d) => s + d.outbound, 0);
  const activeJobs = handlingJobs.filter(
    (j) => j.status !== "Completed",
  ).length;

  const columns: Column<HandlingJob>[] = [
    {
      key: "id",
      header: "Job",
      cell: (j) => (
        <span className="font-mono text-xs font-semibold">{j.id}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (j) => (
        <StatusBadge tone={jobTypeTone[j.type]}>{j.type}</StatusBadge>
      ),
    },
    {
      key: "shipment",
      header: "Shipment",
      hideOn: "sm",
      cell: (j) => <span className="font-mono text-xs">{j.shipmentId}</span>,
    },
    {
      key: "zone",
      header: "Zone",
      hideOn: "md",
      cell: (j) => (
        <span className="text-sm text-muted-foreground">{j.zone}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => (
        <StatusBadge tone={jobStatusTone[j.status]} dot>
          {j.status}
        </StatusBadge>
      ),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      hideOn: "lg",
      cell: (j) => (
        <span className="text-xs tabular-nums">
          {new Date(j.scheduledFor).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {header}

      {/* Compact KPI summary */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          index={0}
          label="Total Occupancy"
          value={`${(occupancy * 100).toFixed(0)}%`}
          icon={WarehouseIcon}
          hint={`${totalUsed.toLocaleString()} / ${totalCapacity.toLocaleString()} pallets`}
          progress={occupancy}
        />
        <KPIStatCard
          index={1}
          label="Inbound (week)"
          value={totalInbound}
          icon={ArrowDownToLine}
          hint="Trucks received"
        />
        <KPIStatCard
          index={2}
          label="Outbound (week)"
          value={totalOutbound}
          icon={ArrowUpFromLine}
          hint="Trucks dispatched"
        />
        <KPIStatCard
          index={3}
          label="Active Jobs"
          value={activeJobs}
          icon={PackageCheck}
          hint="Not yet completed"
        />
      </div>

      {/* Zone occupancy + alerts */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Zone Occupancy"
          description="Pallet load per zone"
          className="lg:col-span-2"
        >
          <div className="space-y-3.5">
            {warehouseZones.map((z) => {
              const ratio = z.used / z.capacity;
              return (
                <ProgressRow
                  key={z.id}
                  label={z.name}
                  value={ratio}
                  meta={`${z.used}/${z.capacity}`}
                  tone={
                    ratio > 0.9 ? "danger" : ratio > 0.75 ? "warning" : "brand"
                  }
                />
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Operational Alerts"
          description="Capacity, delays & reminders"
        >
          <ul className="space-y-2.5">
            {warehouseAlerts.map((a) => {
              const Icon =
                a.severity === "danger"
                  ? ShieldAlert
                  : a.severity === "warning"
                    ? AlertTriangle
                    : Info;
              const tone: StatusTone =
                a.severity === "danger"
                  ? "danger"
                  : a.severity === "warning"
                    ? "warning"
                    : "info";
              const iconColor =
                a.severity === "danger"
                  ? "text-rose-500"
                  : a.severity === "warning"
                    ? "text-amber-500"
                    : "text-sky-500";
              return (
                <li
                  key={a.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.03] px-3.5 py-2.5"
                >
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {a.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.detail}
                    </p>
                  </div>
                  <StatusBadge tone={tone} className="ml-auto shrink-0">
                    {a.severity}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>

      {/* Active handling jobs */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-foreground text-base tracking-tight">
            Active Handling Jobs
          </h2>
          <span className="text-xs text-muted-foreground">
            {handlingJobs.length} total
          </span>
        </div>
        <DataTable rows={handlingJobs} columns={columns} rowKey={(j) => j.id} />
      </section>
    </DashboardLayout>
  );
}
