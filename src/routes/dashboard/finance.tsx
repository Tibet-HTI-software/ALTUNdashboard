import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireRoles } from "@/lib/dashboard/routeGuards";
import { ROUTE_ROLES } from "@/lib/dashboard/roles.config";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Container,
  CreditCard,
  Download,
  Loader2,
  MessageSquareWarning,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { ShipmentDetailDrawer } from "@/components/dashboard/ShipmentDetailDrawer";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  getInvoices,
  markInvoicePaid,
  getOceanShipments,
  useAsyncData,
  toEur,
  type Invoice,
  type InvoiceStatus,
  type InvoiceType,
  type InvoiceCurrency,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useT } from "@/lib/dashboard/i18n";
import { useRole } from "@/lib/dashboard/role";
import { demoError, demoSuccess } from "@/lib/dashboard/demo";
import { downloadFile } from "@/lib/dashboard/exportCsv";

export const Route = createFileRoute("/dashboard/finance")({
  beforeLoad: () => requireRoles(ROUTE_ROLES.finance),
  head: () => ({
    meta: [{ title: "Finance & Invoicing — Altun Logistics" }],
  }),
  component: FinancePage,
});

/* ── Constants ───────────────────────────────────────────────────────── */

type LedgerTab = InvoiceType;
type StatusFilter = "all" | InvoiceStatus;

const STATUS_CLS: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  overdue: "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
};

const KPI_COLOR_CLS: Record<string, string> = {
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-300",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-300",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-600 dark:text-sky-300",
};

/* ── Formatters ──────────────────────────────────────────────────────── */

function eur(n: number) {
  return n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function formatAmount(amount: number, currency: InvoiceCurrency) {
  return amount.toLocaleString("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dueMeta(
  dueDate: string,
  status: InvoiceStatus,
): { label: string; cls: string } {
  if (status === "paid")
    return { label: "—", cls: "text-muted-foreground" };
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const label = due.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  if (diff < 0)
    return {
      label: `${label} · ${Math.abs(diff)}d late`,
      cls: "text-rose-500 dark:text-rose-400",
    };
  if (diff <= 5)
    return { label: `${label} · soon`, cls: "text-amber-600 dark:text-amber-400" };
  return { label, cls: "text-muted-foreground" };
}

/* ── Micro-components ────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const Icon =
    status === "paid"
      ? CheckCircle2
      : status === "overdue"
        ? AlertTriangle
        : Clock;
  const label =
    status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Pending";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold",
        STATUS_CLS[status],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function ShipmentChip({
  shipmentId,
  onClick,
}: {
  shipmentId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-brand/25 bg-brand/[0.07] px-1.5 py-0.5 text-[0.62rem] font-semibold text-brand hover:bg-brand/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand whitespace-nowrap"
    >
      <Container className="h-2.5 w-2.5" />
      {shipmentId}
      <ChevronRight className="h-2 w-2 opacity-60" />
    </button>
  );
}

function KpiTile({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  sub: string;
}) {
  const cls = KPI_COLOR_CLS[color];
  return (
    <div className="card-premium rounded-2xl p-5 flex flex-col gap-3">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br border shadow-sm",
          cls,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-xl font-display font-bold text-foreground mt-0.5 tabular-nums">
          {value}
        </p>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function LedgerToggle({
  value,
  onChange,
  arCount,
  apCount,
}: {
  value: LedgerTab;
  onChange: (v: LedgerTab) => void;
  arCount: number;
  apCount: number;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-foreground/[0.03] p-0.5">
      {(
        [
          { key: "receivable", icon: ArrowDownToLine, label: "Receivable (AR)", count: arCount },
          { key: "payable", icon: ArrowUpFromLine, label: "Payable (AP)", count: apCount },
        ] as const
      ).map(({ key, icon: Icon, label, count }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
            value === key
              ? "bg-background border border-border text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
          <span
            className={cn(
              "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full text-[0.58rem] font-bold px-0.5",
              value === key
                ? "bg-brand text-white"
                : "bg-foreground/10 text-foreground",
            )}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

function FilterPills({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  const pills: { key: StatusFilter; label: string; active: string; dot?: string }[] = [
    { key: "all", label: "All", active: "bg-foreground text-background" },
    {
      key: "pending",
      label: "Pending",
      active: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      dot: "bg-amber-500",
    },
    {
      key: "overdue",
      label: "Overdue",
      active: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
      dot: "bg-rose-500",
    },
    {
      key: "paid",
      label: "Paid",
      active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {pills.map(({ key, label, active, dot }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
            value === key
              ? active
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
          )}
        >
          {dot && value === key && (
            <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          )}
          {label}
          <span className="tabular-nums opacity-70">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

/* ── CSV export helper ───────────────────────────────────────────────── */

function generateInvoiceCsv(invoices: Invoice[]): string {
  const header =
    "Invoice ID,Type,Client/Carrier,Shipment,Description,Amount,Currency,Status,Issued,Due,Paid\n";
  const rows = invoices
    .map((inv) =>
      [
        inv.id,
        inv.type,
        `"${inv.clientOrCarrierName}"`,
        inv.shipmentId ?? "",
        `"${inv.description}"`,
        inv.amount,
        inv.currency,
        inv.status,
        inv.issuedDate,
        inv.dueDate,
        inv.paidDate ?? "",
      ].join(","),
    )
    .join("\n");
  return header + rows;
}

/* ── Page ────────────────────────────────────────────────────────────── */

function FinancePage() {
  const t = useT();
  const { role } = useRole();
  const { data, loading, error, reload } = useAsyncData(getInvoices, []);
  const { data: shipments } = useAsyncData(getOceanShipments, []);

  const [ledger, setLedger] = useState<LedgerTab>("receivable");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [localStatuses, setLocalStatuses] = useState<Record<string, InvoiceStatus>>({});
  const [markingPaid, setMarkingPaid] = useState<Set<string>>(new Set());
  const [drawerShipment, setDrawerShipment] = useState<OceanShipment | null>(null);

  const allInvoices = useMemo(() => data ?? [], [data]);

  /** Apply optimistic local overrides. */
  const effective = useMemo(
    () =>
      allInvoices.map((inv) =>
        localStatuses[inv.id]
          ? { ...inv, status: localStatuses[inv.id] }
          : inv,
      ),
    [allInvoices, localStatuses],
  );

  /* ── KPI computation (AR-only, cross-currency) ─────────────────── */
  const kpis = useMemo(() => {
    const ar = effective.filter((inv) => inv.type === "receivable");
    const outstanding = ar.filter((inv) => inv.status !== "paid");
    const overdue = ar.filter((inv) => inv.status === "overdue");
    const paidThisMonth = ar.filter(
      (inv) =>
        inv.status === "paid" &&
        (inv.paidDate ?? inv.dueDate).startsWith("2026-05"),
    );
    const paidWithDate = ar.filter(
      (inv) => inv.status === "paid" && inv.paidDate,
    );

    const outstandingEur = outstanding.reduce(
      (s, inv) => s + toEur(inv.amount, inv.currency),
      0,
    );
    const overdueEur = overdue.reduce(
      (s, inv) => s + toEur(inv.amount, inv.currency),
      0,
    );
    const revenueMtd = paidThisMonth.reduce(
      (s, inv) => s + toEur(inv.amount, inv.currency),
      0,
    );
    const avgDays =
      paidWithDate.length > 0
        ? paidWithDate.reduce((s, inv) => {
            const d = Math.round(
              (new Date(inv.paidDate!).getTime() -
                new Date(inv.issuedDate).getTime()) /
                86_400_000,
            );
            return s + d;
          }, 0) / paidWithDate.length
        : 0;

    return {
      outstandingEur,
      outstandingCount: outstanding.length,
      revenueMtd,
      overdueEur,
      overdueCount: overdue.length,
      avgDays: Math.round(avgDays * 10) / 10,
    };
  }, [effective]);

  /* ── Filtered table rows ─────────────────────────────────────────── */
  const ledgerRows = useMemo(
    () => effective.filter((inv) => inv.type === ledger),
    [effective, ledger],
  );

  const filteredRows = useMemo(
    () =>
      statusFilter === "all"
        ? ledgerRows
        : ledgerRows.filter((inv) => inv.status === statusFilter),
    [ledgerRows, statusFilter],
  );

  const filterCounts: Record<StatusFilter, number> = useMemo(
    () => ({
      all: ledgerRows.length,
      pending: ledgerRows.filter((inv) => inv.status === "pending").length,
      overdue: ledgerRows.filter((inv) => inv.status === "overdue").length,
      paid: ledgerRows.filter((inv) => inv.status === "paid").length,
    }),
    [ledgerRows],
  );

  const arCount = effective.filter((inv) => inv.type === "receivable").length;
  const apCount = effective.filter((inv) => inv.type === "payable").length;

  /* ── Actions ─────────────────────────────────────────────────────── */
  function handleShipmentClick(shipmentId: string) {
    setDrawerShipment(
      (shipments ?? []).find((s) => s.id === shipmentId) ?? null,
    );
  }

  async function handleMarkPaid(id: string) {
    if (markingPaid.has(id)) return;
    setMarkingPaid((prev) => new Set([...prev, id]));
    setLocalStatuses((prev) => ({ ...prev, [id]: "paid" }));
    try {
      await markInvoicePaid(id);
      toast.success("Invoice marked as paid", {
        description: `${id} · payment recorded today.`,
      });
    } catch (err) {
      setLocalStatuses((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      demoError(
        "Update failed",
        err instanceof Error ? err.message : "Could not update invoice.",
      );
    } finally {
      setMarkingPaid((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  function handleExportCsv() {
    const csv = generateInvoiceCsv(filteredRows);
    const date = new Date().toISOString().slice(0, 10);
    const type = ledger === "receivable" ? "ar" : "ap";
    downloadFile(
      csv,
      `altun-${type}-${date}.csv`,
      "text/csv;charset=utf-8",
    );
    toast.success("CSV exported", {
      description: `${filteredRows.length} ${ledger === "receivable" ? "receivables" : "payables"} downloaded.`,
    });
  }

  /* ── Table columns ───────────────────────────────────────────────── */
  const columns: Column<Invoice>[] = [
    {
      key: "id",
      header: "Invoice",
      cell: (inv) => (
        <div>
          <p className="font-mono text-[0.72rem] font-semibold text-foreground">
            {inv.id}
          </p>
          <p className="text-[0.62rem] text-muted-foreground mt-0.5">
            Issued {formatDate(inv.issuedDate)}
          </p>
        </div>
      ),
    },
    {
      key: "client",
      header: ledger === "receivable" ? "Client" : "Carrier",
      cell: (inv) => (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.55rem] font-bold",
              inv.type === "receivable"
                ? "bg-brand/10 text-brand"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {inv.clientOrCarrierName
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
          <span className="text-xs font-medium text-foreground">
            {inv.clientOrCarrierName}
          </span>
        </div>
      ),
    },
    {
      key: "shipment",
      header: "Shipment",
      hideOn: "md",
      cell: (inv) =>
        inv.shipmentId ? (
          <ShipmentChip
            shipmentId={inv.shipmentId}
            onClick={() => handleShipmentClick(inv.shipmentId!)}
          />
        ) : (
          <span className="text-[0.68rem] text-muted-foreground/50">—</span>
        ),
    },
    {
      key: "description",
      header: "Description",
      hideOn: "lg",
      className: "max-w-[14rem]",
      cell: (inv) => (
        <p className="text-xs text-muted-foreground truncate" title={inv.description}>
          {inv.description}
        </p>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (inv) => (
        <div className="text-right">
          <p className="font-display font-bold text-foreground tabular-nums">
            {formatAmount(inv.amount, inv.currency)}
          </p>
          {inv.currency === "USD" && (
            <p className="text-[0.6rem] text-muted-foreground tabular-nums">
              ≈ {eur(toEur(inv.amount, inv.currency))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "due",
      header: "Due Date",
      hideOn: "sm",
      cell: (inv) => {
        const { label, cls } = dueMeta(
          inv.dueDate,
          localStatuses[inv.id] ?? inv.status,
        );
        return (
          <div>
            <p className={cn("text-xs font-medium tabular-nums", cls)}>
              {label}
            </p>
            {inv.paidDate && (
              <p className="text-[0.62rem] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Paid {formatDate(inv.paidDate)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={localStatuses[inv.id] ?? inv.status} />
          {inv.discrepancy && (localStatuses[inv.id] ?? inv.status) !== "paid" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[0.58rem] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap w-fit">
              <AlertTriangle className="h-2.5 w-2.5" />
              Discrepancy
            </span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      cell: (inv) => {
        const status = localStatuses[inv.id] ?? inv.status;
        if (status === "paid") {
          return (
            <span className="inline-flex items-center gap-1 text-[0.62rem] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Paid
            </span>
          );
        }
        // Discrepancy: forwarder sees Review/Dispute button
        if (inv.discrepancy && (role === "forwarder" || role === "ops_manager")) {
          return (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  demoSuccess(
                    "Dispute raised",
                    `Dispute logged for ${inv.id} — budgeted €${inv.discrepancy!.budgeted.toLocaleString()} vs actual €${inv.discrepancy!.actual.toLocaleString()}. Carrier notified.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-2 py-1 text-[0.62rem] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 whitespace-nowrap"
              >
                <MessageSquareWarning className="h-3 w-3" />
                Dispute
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  demoSuccess(
                    "Invoice approved",
                    `${inv.id} discrepancy reviewed and approved for payment.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-2 py-1 text-[0.62rem] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 whitespace-nowrap"
              >
                <Check className="h-3 w-3" />
                Approve
              </button>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkPaid(inv.id);
            }}
            disabled={markingPaid.has(inv.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-2 py-1 text-[0.62rem] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/[0.12] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand whitespace-nowrap"
          >
            {markingPaid.has(inv.id) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Mark paid
          </button>
        );
      },
    },
  ];

  /* ── Render ──────────────────────────────────────────────────────── */
  const header = (
    <DashboardPageHeader
      title={t("page.finance.title")}
      description={t("page.finance.sub")}
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Finance" },
      ]}
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || filteredRows.length === 0}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      }
    />
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading invoices…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Invoice data unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {header}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          icon={Receipt}
          color="amber"
          label="Outstanding (AR)"
          value={eur(kpis.outstandingEur)}
          sub={`${kpis.outstandingCount} invoice${kpis.outstandingCount !== 1 ? "s" : ""} pending`}
        />
        <KpiTile
          icon={TrendingUp}
          color="emerald"
          label="Revenue MTD"
          value={eur(kpis.revenueMtd)}
          sub="+8.4% vs last month"
        />
        <KpiTile
          icon={AlertTriangle}
          color="rose"
          label="Overdue balance"
          value={eur(kpis.overdueEur)}
          sub={`${kpis.overdueCount} invoice${kpis.overdueCount !== 1 ? "s" : ""} overdue`}
        />
        <KpiTile
          icon={CreditCard}
          color="sky"
          label="Avg. days to pay"
          value={`${kpis.avgDays} days`}
          sub="Target: 21 days"
        />
      </div>

      {/* ── Ledger section ── */}
      <div className="mt-6 space-y-4">
        {/* Toolbar: ledger toggle left, filter pills right */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LedgerToggle
            value={ledger}
            onChange={(v) => {
              setLedger(v);
              setStatusFilter("all");
            }}
            arCount={arCount}
            apCount={apCount}
          />
          <FilterPills
            value={statusFilter}
            onChange={setStatusFilter}
            counts={filterCounts}
          />
        </div>

        {/* ── Data table ── */}
        <DataTable
          rows={filteredRows}
          columns={columns}
          rowKey={(inv) => inv.id}
          empty={
            statusFilter === "all"
              ? "No invoices found."
              : `No ${statusFilter} invoices.`
          }
        />

        {/* Footer note */}
        <p className="text-[0.65rem] text-muted-foreground/60 text-center pb-2">
          <Banknote className="inline h-3 w-3 mr-1 -mt-px" />
          USD amounts converted at ECB proxy rate (€{(0.92).toFixed(2)}/USD) for KPI
          aggregation only · Paid invoices show confirmed payment date
        </p>
      </div>

      <ShipmentDetailDrawer
        shipment={drawerShipment}
        onClose={() => setDrawerShipment(null)}
      />
    </DashboardLayout>
  );
}
