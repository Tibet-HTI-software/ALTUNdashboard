/**
 * /portal/invoices — Client invoice overview.
 *
 * Data fetched via getClientInvoices(clientId) — strictly filtered by
 * client_id so a client can only ever see their own invoices.
 */

import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Anchor,
  CheckCheck,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getClientInvoices,
  useAsyncData,
  PORTAL_DEMO_CLIENT_ID,
  type ClientInvoice,
  type ClientInvoiceStatus,
} from "@/lib/dashboard/api";

export const Route = createFileRoute("/portal/invoices")({
  head: () => ({
    meta: [{ title: "My Invoices — Altun Logistics Portal" }],
  }),
  component: PortalInvoicesPage,
});

/* ── Status helpers ──────────────────────────────────────────────────────── */

const STATUS_CLS: Record<ClientInvoiceStatus, string> = {
  pending:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  overdue:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  paid:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const STATUS_LABEL: Record<ClientInvoiceStatus, string> = {
  pending: "Pending",
  overdue: "Overdue",
  paid: "Paid",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatEur(amount: number, currency: "EUR" | "USD") {
  const eur = currency === "USD" ? amount * 0.92 : amount;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

/* ── Invoice row ─────────────────────────────────────────────────────────── */

function InvoiceRow({ inv }: { inv: ClientInvoice }) {
  return (
    <div className="card-premium rounded-xl px-4 py-3.5 flex items-center gap-4">
      {/* Icon */}
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
        inv.status === "paid"
          ? "border-emerald-500/20 bg-emerald-500/[0.06]"
          : inv.status === "overdue"
            ? "border-rose-500/20 bg-rose-500/[0.06]"
            : "border-sky-500/20 bg-sky-500/[0.06]",
      )}>
        {inv.status === "paid" ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
        ) : inv.status === "overdue" ? (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-sky-500" />
        )}
      </span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.8rem] font-semibold text-foreground truncate">
          {inv.description}
        </p>
        <p className="text-[0.65rem] text-muted-foreground">
          {inv.id}
          {inv.shipmentId && ` · ${inv.shipmentId}`}
          {" · "}
          {inv.status === "paid" && inv.paidDate
            ? `Paid ${formatDate(inv.paidDate)}`
            : `Due ${formatDate(inv.dueDate)}`}
        </p>
      </div>

      {/* Amount + status */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[0.85rem] font-bold text-foreground tabular-nums">
          {formatEur(inv.amount, inv.currency)}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold",
            STATUS_CLS[inv.status],
          )}
        >
          {STATUS_LABEL[inv.status]}
        </span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function PortalInvoicesPage() {
  const { user } = useAuth();
  const clientId = user?.id ?? PORTAL_DEMO_CLIENT_ID;

  const { data, loading, error, reload } = useAsyncData(
    () => getClientInvoices(clientId),
    [clientId],
  );

  const invoices = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => ({
    outstanding: invoices
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + (i.currency === "USD" ? i.amount * 0.92 : i.amount), 0),
    overdue: invoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + (i.currency === "USD" ? i.amount * 0.92 : i.amount), 0),
  }), [invoices]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 animate-pulse">
            <Anchor className="h-5 w-5 text-brand" />
          </span>
          <p className="text-sm text-muted-foreground">Loading your invoices…</p>
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-semibold">Could not load invoices</p>
          <button onClick={reload} className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold">Retry</button>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 shrink-0">
            <FileText className="h-4.5 w-4.5 text-brand" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">My Invoices</h1>
            <p className="text-[0.72rem] text-muted-foreground">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* KPI strip */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "rounded-xl border px-4 py-3",
              totals.outstanding > 0
                ? "border-sky-500/20 bg-sky-500/[0.04]"
                : "border-emerald-500/20 bg-emerald-500/[0.04]",
            )}>
              <div className={cn(
                "text-2xl font-display font-bold tabular-nums",
                totals.outstanding > 0 ? "text-sky-600 dark:text-sky-400" : "text-emerald-500",
              )}>
                {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totals.outstanding)}
              </div>
              <div className="text-[0.72rem] font-semibold text-foreground mt-0.5">Outstanding</div>
            </div>
            {totals.overdue > 0 && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-4 py-3">
                <div className="text-2xl font-display font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totals.overdue)}
                </div>
                <div className="text-[0.72rem] font-semibold text-foreground mt-0.5">Overdue</div>
              </div>
            )}
          </div>
        )}

        {/* Invoice list */}
        <div className="flex flex-col gap-2">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <FileText className="h-8 w-8 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            </div>
          ) : (
            invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)
          )}
        </div>

        <p className="text-[0.68rem] text-muted-foreground text-center">
          For invoice queries, please contact{" "}
          <a href="/portal/support" className="text-brand hover:opacity-80 font-semibold">support</a>.
        </p>
      </div>
    </PortalLayout>
  );
}
