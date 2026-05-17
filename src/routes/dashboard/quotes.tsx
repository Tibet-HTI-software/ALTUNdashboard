import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Send,
  Check,
  X,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { FilterBar, SelectFilter } from "@/components/dashboard/FilterBar";
import {
  StatusBadge,
  quoteStatusTone,
  priorityTone,
} from "@/components/dashboard/StatusBadge";
import {
  getQuotes,
  updateQuoteStatus,
  useAsyncData,
} from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import type { Quote, QuoteStatus } from "@/lib/dashboard/types";
import { formatDate } from "@/lib/dashboard/format";
import { demoAction, demoSuccess, demoError } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/quotes")({
  head: () => ({ meta: [{ title: "Quotes — Altun Logistics Operations" }] }),
  component: QuotesPage,
});

const STATUSES: QuoteStatus[] = [
  "New",
  "Reviewing",
  "Sent",
  "Approved",
  "Rejected",
];

function QuotesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: quotes, loading, error, reload } = useAsyncData(getQuotes, []);

  // Default-select the first quote once data lands.
  const firstId = quotes?.[0]?.id;
  if (firstId && openId === null) {
    // Setting state during render is intentional and idempotent here:
    // it only runs once per page load, when openId still has its
    // initial value and quotes have just resolved.
    setOpenId(firstId);
  }

  const rows = useMemo(() => {
    if (!quotes) return [];
    const q = search.trim().toLowerCase();
    return quotes.filter((row) => {
      if (status !== "All" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q) ||
        row.goodsDescription.toLowerCase().includes(q) ||
        row.portOfLoading.toLowerCase().includes(q) ||
        row.portOfDestination.toLowerCase().includes(q)
      );
    });
  }, [quotes, search, status]);

  const counts = STATUSES.map((s) => ({
    status: s,
    count: (quotes ?? []).filter((q) => q.status === s).length,
  }));

  const open = (quotes ?? []).find((q) => q.id === openId) ?? null;

  /**
   * Wire approve/reject to the mock service. The service returns the
   * updated quote shape; for the prototype we just reload the list so the
   * UI re-renders consistently.
   */
  async function handleStatusChange(id: string, next: QuoteStatus) {
    try {
      await updateQuoteStatus(id, next);
      demoSuccess(
        `Quote ${next.toLowerCase()}`,
        `Quote ${id} marked as ${next}.`,
      );
      reload();
    } catch (err) {
      demoError(
        "Could not update quote",
        err instanceof Error ? err.message : "Failed to update quote.",
      );
    }
  }

  const columns: Column<Quote>[] = [
    {
      key: "id",
      header: "Quote",
      cell: (q) => (
        <span className="font-mono text-xs font-semibold text-navy-deep">
          {q.id}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (q) => <span className="font-medium">{q.customer}</span>,
    },
    {
      key: "direction",
      header: "Direction",
      hideOn: "sm",
      cell: (q) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            q.direction === "Import" ? "text-sky-700" : "text-brand"
          }`}
          title={q.direction}
        >
          {q.direction === "Import" ? (
            <ArrowDownToLine className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpFromLine className="h-3.5 w-3.5" />
          )}
          {q.direction}
        </span>
      ),
    },
    {
      key: "route",
      header: "Route",
      hideOn: "md",
      cell: (q) => (
        <span className="text-sm text-muted-foreground">
          {q.portOfLoading} → {q.portOfDestination}
        </span>
      ),
    },
    {
      key: "container",
      header: "Container",
      hideOn: "lg",
      cell: (q) => (
        <span className="text-xs">
          {q.container}
          {q.gauge && (
            <span
              className={`ml-1.5 inline-block rounded px-1.5 py-0.5 text-[0.6rem] font-semibold ${
                q.gauge === "Out of Gauge"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {q.gauge}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "goods",
      header: "Goods",
      hideOn: "lg",
      cell: (q) => (
        <span
          className="text-xs text-muted-foreground block max-w-[14rem] truncate"
          title={q.goodsDescription}
        >
          {q.goodsDescription}
        </span>
      ),
    },
    {
      key: "incoterm",
      header: "Incoterm",
      hideOn: "md",
      cell: (q) => (
        <span className="font-mono text-[0.7rem] font-semibold text-navy-deep bg-secondary/60 rounded px-1.5 py-0.5">
          {q.incoterm}
        </span>
      ),
    },
    {
      key: "urgency",
      header: "Urgency",
      hideOn: "lg",
      cell: (q) => (
        <StatusBadge tone={priorityTone(q.urgency)} dot>
          {q.urgency}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (q) => (
        <StatusBadge tone={quoteStatusTone(q.status)}>{q.status}</StatusBadge>
      ),
    },
    {
      key: "requested",
      header: "Requested",
      hideOn: "lg",
      cell: (q) => (
        <span className="text-xs tabular-nums">
          {formatDate(q.requestedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (q) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="View quote details"
            onClick={() => setOpenId(q.id)}
            className="p-1.5 rounded-md hover:bg-secondary text-navy-deep transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Send to customer (demo)"
            onClick={() =>
              demoAction(`this would email quote ${q.id} to the customer.`)
            }
            className="p-1.5 rounded-md hover:bg-brand-soft text-brand transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Approve quote (demo)"
            onClick={() => handleStatusChange(q.id, "Approved")}
            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Reject quote (demo)"
            onClick={() => handleStatusChange(q.id, "Rejected")}
            className="p-1.5 rounded-md hover:bg-rose-50 text-rose-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Quote Requests"
        description="Workflow for incoming customer quote requests."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Quotes" }]}
        actions={
          <button
            type="button"
            onClick={() => demoAction("this would open the new quote form.")}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New quote
          </button>
        }
      />

      {/* Status pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {counts.map((c) => {
          const active = status === c.status;
          return (
            <button
              key={c.status}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(active ? "All" : c.status)}
              className={`rounded-lg border p-3.5 text-left transition-colors ${
                active
                  ? "border-brand/40 bg-brand-soft/40"
                  : "border-border bg-card hover:border-brand/40"
              }`}
            >
              <div
                className={`text-[0.6rem] uppercase tracking-widest font-semibold ${
                  active ? "text-brand" : "text-muted-foreground/80"
                }`}
              >
                {c.status}
              </div>
              <div className="mt-1.5 font-display text-xl font-bold text-navy-deep tabular-nums">
                {c.count}
              </div>
            </button>
          );
        })}
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quote, customer, goods, port…"
        filters={
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "All", label: "All" },
              ...STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
        }
      />

      {loading && <LoadingState label="Loading quotes…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && quotes && (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(q) => q.id}
              onRowClick={(q) => setOpenId(q.id)}
              empty="No quotes match the current filters."
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {rows.length} of {quotes.length} quotes
            </p>
          </div>

          <div className="lg:col-span-2">
            <QuoteDetail quote={open} onStatusChange={handleStatusChange} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── detail panel ─────────────────────────────────────────────────── */

function QuoteDetail({
  quote,
  onStatusChange,
}: {
  quote: Quote | null;
  onStatusChange: (id: string, next: QuoteStatus) => void;
}) {
  if (!quote) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Select a quote to view its full request details.
      </div>
    );
  }

  return (
    <article className="card-premium rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[0.7rem] font-semibold text-muted-foreground">
              {quote.id}
            </p>
            <h2 className="font-display font-bold text-navy-deep text-lg leading-tight mt-0.5">
              {quote.customer}
            </h2>
          </div>
          <StatusBadge tone={quoteStatusTone(quote.status)}>
            {quote.status}
          </StatusBadge>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[0.7rem] font-semibold rounded-full px-2.5 py-0.5 ${
              quote.direction === "Import"
                ? "bg-sky-50 text-sky-700"
                : "bg-brand-soft text-brand"
            }`}
          >
            {quote.direction === "Import" ? (
              <ArrowDownToLine className="h-3 w-3" />
            ) : (
              <ArrowUpFromLine className="h-3 w-3" />
            )}
            {quote.direction}
          </span>
          <StatusBadge tone={priorityTone(quote.urgency)} dot>
            {quote.urgency}
          </StatusBadge>
          <span className="text-[0.7rem] text-muted-foreground">
            Requested {formatDate(quote.requestedAt)}
          </span>
        </div>
      </header>

      <div className="px-5 py-4 space-y-5 max-h-[42rem] overflow-y-auto">
        <Group title="Contact">
          <Field label="Name" value={quote.contactName ?? "—"} />
          <Field label="Email" value={quote.contactEmail ?? "—"} mono />
          <Field label="Phone" value={quote.contactPhone ?? "—"} mono />
          <Field label="Assigned to" value={quote.assignedTo} />
        </Group>

        <Group title="Shipment">
          <Field label="Direction" value={quote.direction} />
        </Group>

        <Group title="Container & Goods">
          <Field label="Container" value={quote.container} />
          {quote.gauge && (
            <Field
              label="Gauge"
              value={quote.gauge}
              highlight={quote.gauge === "Out of Gauge"}
            />
          )}
          <Field label="Goods" value={quote.goodsDescription} full />
          <Field label="HS Code" value={quote.hsCode ?? "—"} mono />
          <Field
            label="Gross weight"
            value={`${quote.grossWeightKg.toLocaleString()} kg`}
          />
          <Field
            label="Net weight"
            value={`${quote.netWeightKg.toLocaleString()} kg`}
          />
        </Group>

        <Group title="Route & Terms">
          <Field label="Port of loading" value={quote.portOfLoading} />
          <Field label="Port of destination" value={quote.portOfDestination} />
          <Field
            label="Incoterm"
            value={
              <span className="font-mono font-semibold text-navy-deep bg-secondary/60 rounded px-1.5 py-0.5 text-xs">
                {quote.incoterm}
              </span>
            }
          />
          <Field
            label="Insurance"
            value={
              <span className="inline-flex items-center gap-1 text-xs">
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${quote.insurance ? "text-emerald-600" : "text-muted-foreground"}`}
                />
                {quote.insurance ? "Yes" : "No"}
              </span>
            }
          />
          <Field
            label="VGM required"
            value={
              <span className="inline-flex items-center gap-1 text-xs">
                <Scale
                  className={`h-3.5 w-3.5 ${quote.vgmRequired ? "text-emerald-600" : "text-muted-foreground"}`}
                />
                {quote.vgmRequired ? "Yes" : "No"}
              </span>
            }
          />
        </Group>

        <Group title="Loading Details">
          <Field label="Address" value={quote.loading.address} full />
          <Field label="Postal code" value={quote.loading.postalCode} />
          <Field label="City" value={quote.loading.city} />
          <Field label="Country" value={quote.loading.country} />
        </Group>

        <Group title="Delivery Details">
          <Field label="Address" value={quote.delivery.address} full />
          <Field label="Postal code" value={quote.delivery.postalCode} />
          <Field label="City" value={quote.delivery.city} />
          <Field label="Country" value={quote.delivery.country} />
        </Group>

        {quote.notes && (
          <Group title="Notes">
            <p className="text-xs text-navy-deep leading-relaxed bg-secondary/40 border border-border rounded-md px-3 py-2 col-span-2">
              {quote.notes}
            </p>
          </Group>
        )}
      </div>

      <footer className="border-t border-border px-5 py-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            demoAction(`this would email quote ${quote.id} to the customer.`)
          }
          className="inline-flex items-center gap-1.5 h-8 rounded-md bg-brand text-white px-3 text-xs font-medium hover:bg-brand-strong transition-colors"
        >
          <Send className="h-3 w-3" /> Send
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(quote.id, "Approved")}
          className="inline-flex items-center gap-1.5 h-8 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 text-xs font-medium hover:bg-emerald-100 transition-colors"
        >
          <Check className="h-3 w-3" /> Approve
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(quote.id, "Rejected")}
          className="inline-flex items-center gap-1.5 h-8 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 text-xs font-medium hover:bg-rose-100 transition-colors"
        >
          <X className="h-3 w-3" /> Reject
        </button>
      </footer>
    </article>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[0.65rem] uppercase tracking-widest font-bold text-brand mb-2">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{children}</dl>
    </section>
  );
}

function Field({
  label,
  value,
  full,
  mono,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 font-medium text-navy-deep break-words ${mono ? "font-mono text-[0.7rem]" : ""} ${
          highlight ? "text-amber-700" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
