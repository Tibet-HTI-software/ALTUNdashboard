import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { FilterBar, SelectFilter } from "@/components/dashboard/FilterBar";
import {
  StatusBadge,
  customerStatusTone,
} from "@/components/dashboard/StatusBadge";
import { demoAction } from "@/lib/dashboard/demo";
import { getCustomers, useAsyncData } from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import type { Customer } from "@/lib/dashboard/types";
import { formatDate } from "@/lib/dashboard/format";

export const Route = createFileRoute("/dashboard/customers")({
  head: () => ({ meta: [{ title: "Customers — Altun Logistics Operations" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");

  const {
    data: customers,
    loading,
    error,
    reload,
  } = useAsyncData(getCustomers, []);

  const rows = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (status !== "All" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.routeFocus.toLowerCase().includes(q)
      );
    });
  }, [customers, search, status]);

  const columns: Column<Customer>[] = [
    {
      key: "company",
      header: "Company",
      cell: (c) => (
        <div>
          <div className="font-semibold text-navy-deep">{c.company}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{c.id}</div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      hideOn: "md",
      cell: (c) => <span className="text-sm">{c.contact}</span>,
    },
    {
      key: "country",
      header: "Country",
      hideOn: "sm",
      cell: (c) => <span className="text-sm">{c.country}</span>,
    },
    {
      key: "route",
      header: "Route focus",
      hideOn: "lg",
      cell: (c) => (
        <span className="text-sm text-muted-foreground">{c.routeFocus}</span>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (c) => (
        <span className="font-display font-bold text-navy-deep tabular-nums">
          {c.activeShipments}
        </span>
      ),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      hideOn: "lg",
      cell: (c) => (
        <span className="text-xs tabular-nums">
          {formatDate(c.lastActivity)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <StatusBadge tone={customerStatusTone(c.status)} dot>
          {c.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Customers"
        description="Active accounts, onboarding pipeline, and lane focus."
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Customers" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => demoAction("this would open the add-customer form.")}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add customer
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search company, country, route…"
        filters={
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "All", label: "All" },
              { value: "Active", label: "Active" },
              { value: "Onboarding", label: "Onboarding" },
              { value: "On Hold", label: "On Hold" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
        }
      />

      {loading && <LoadingState label="Loading customers…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && customers && (
        <>
          <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} />
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {rows.length} of {customers.length} customers
          </p>
        </>
      )}
    </DashboardLayout>
  );
}
