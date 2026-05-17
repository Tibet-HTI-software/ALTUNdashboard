import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Ship, Truck, Train, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { FilterBar, SelectFilter } from "@/components/dashboard/FilterBar";
import {
  StatusBadge,
  priorityTone,
  shipmentStatusTone,
} from "@/components/dashboard/StatusBadge";
import { demoAction } from "@/lib/dashboard/demo";
import { getShipments, useAsyncData } from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import type {
  Priority,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from "@/lib/dashboard/types";
import { formatDateShort } from "@/lib/dashboard/format";

export const Route = createFileRoute("/dashboard/shipments")({
  head: () => ({ meta: [{ title: "Shipments — Altun Logistics Operations" }] }),
  component: ShipmentsPage,
});

const STATUSES: (ShipmentStatus | "All")[] = [
  "All",
  "Booked",
  "In Transit",
  "Customs Clearance",
  "At Warehouse",
  "Delivered",
  "Delayed",
];

const MODES: (TransportMode | "All")[] = ["All", "Sea", "Road", "Rail"];

const PRIORITIES: (Priority | "All")[] = [
  "All",
  "Urgent",
  "High",
  "Normal",
  "Low",
];

const ETA_SORTS = ["Earliest arrival", "Latest arrival"] as const;

function modeIcon(m: TransportMode) {
  if (m === "Sea") return Ship;
  if (m === "Rail") return Train;
  return Truck;
}

function ShipmentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [mode, setMode] = useState<string>("All");
  const [priority, setPriority] = useState<string>("All");
  const [etaSort, setEtaSort] = useState<string>("Earliest arrival");

  const {
    data: shipments,
    loading,
    error,
    reload,
  } = useAsyncData(getShipments, []);

  const rows = useMemo(() => {
    if (!shipments) return [];
    const q = search.trim().toLowerCase();
    const filtered = shipments.filter((s) => {
      if (status !== "All" && s.status !== status) return false;
      if (mode !== "All" && s.mode !== mode) return false;
      if (priority !== "All" && s.priority !== priority) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q)
      );
    });

    // Sort by ETA — never mutate the source array.
    // Earliest arrival = ascending ETA, Latest arrival = descending ETA.
    const dir = etaSort === "Latest arrival" ? -1 : 1;
    return [...filtered].sort(
      (a, b) => dir * (new Date(a.eta).getTime() - new Date(b.eta).getTime()),
    );
  }, [shipments, search, status, mode, priority, etaSort]);

  const columns: Column<Shipment>[] = [
    {
      key: "id",
      header: "Shipment",
      cell: (s) => (
        <div className="min-w-0">
          <Link
            to="/dashboard/shipments/$id"
            params={{ id: s.id }}
            className="font-mono text-xs font-semibold text-brand hover:underline underline-offset-4"
          >
            {s.id}
          </Link>
          <div className="text-xs text-muted-foreground mt-0.5">
            {s.container}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      className: "max-w-[10rem] sm:max-w-[14rem] md:max-w-none",
      cell: (s) => (
        <span className="font-medium block truncate" title={s.customer}>
          {s.customer}
        </span>
      ),
    },
    {
      key: "route",
      header: "Route",
      hideOn: "md",
      cell: (s) => (
        <span className="text-sm text-muted-foreground">
          {s.origin} → {s.destination}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      hideOn: "sm",
      cell: (s) => {
        const Icon = modeIcon(s.mode);
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon className="h-3.5 w-3.5 text-brand" />
            {s.mode}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => (
        <StatusBadge tone={shipmentStatusTone(s.status)}>
          {s.status}
        </StatusBadge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      hideOn: "lg",
      cell: (s) => (
        <StatusBadge tone={priorityTone(s.priority)} dot>
          {s.priority}
        </StatusBadge>
      ),
    },
    {
      key: "etd",
      header: "ETD",
      hideOn: "lg",
      cell: (s) => (
        <span className="tabular-nums text-xs">{formatDateShort(s.etd)}</span>
      ),
    },
    {
      key: "eta",
      header: "ETA",
      cell: (s) => (
        <span className="tabular-nums text-xs">{formatDateShort(s.eta)}</span>
      ),
    },
    {
      key: "assigned",
      header: "Assigned",
      hideOn: "lg",
      cell: (s) => (
        <span className="text-xs text-muted-foreground">{s.assignedTo}</span>
      ),
    },
    {
      key: "view",
      header: "",
      cell: (s) => (
        <Link
          to="/dashboard/shipments/$id"
          params={{ id: s.id }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline underline-offset-4"
        >
          View <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Shipments"
        description="Search, filter, and manage every shipment in motion."
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Shipments" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => demoAction("this would open the new shipment form.")}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New shipment
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ID, customer, origin, destination…"
        filters={
          <>
            <SelectFilter
              label="Status"
              value={status}
              onChange={setStatus}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <SelectFilter
              label="Mode"
              value={mode}
              onChange={setMode}
              options={MODES.map((m) => ({ value: m, label: m }))}
            />
            <SelectFilter
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
            <SelectFilter
              label="ETA"
              value={etaSort}
              onChange={setEtaSort}
              options={ETA_SORTS.map((d) => ({ value: d, label: d }))}
            />
          </>
        }
      />

      {loading && <LoadingState label="Loading shipments…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && shipments && (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(s) => s.id}
            empty="No shipments match the current filters."
          />

          <p className="mt-3 text-xs text-muted-foreground">
            Showing {rows.length} of {shipments.length} shipments
          </p>
        </>
      )}
    </DashboardLayout>
  );
}
