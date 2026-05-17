import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Loader2,
  Plus,
  Search,
  Ship,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewQuoteModal } from "@/components/dashboard/NewQuoteModal";
import { getQuotes, updateQuoteStatus, useAsyncData } from "@/lib/dashboard/api";
import type { Quote } from "@/lib/dashboard/types";
import { useGlobalSearch } from "@/lib/dashboard/search";
import { useT } from "@/lib/dashboard/i18n";
import { demoError } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/quotes")({
  head: () => ({ meta: [{ title: "Quotes — Altun Logistics Operations" }] }),
  component: QuotesPage,
});

/** Deterministic spot/contract rate per quote so the preview stays stable. */
function rateFor(q: Quote): { spot: number; contract: number } {
  let h = 0;
  for (const c of q.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const spot = 1400 + (h % 1700);
  const contract = Math.round(spot * 0.88);
  return { spot, contract };
}

const eur = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

type Decision = "approved" | "declined";

function QuotesPage() {
  const { data, loading, error, reload } = useAsyncData(getQuotes, []);
  const { query } = useGlobalSearch();
  const t = useT();

  const [openId, setOpenId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  /** ID of the quote currently being approved/declined (shows spinner). */
  const [deciding, setDeciding] = useState<string | null>(null);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);

  const rows = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.portOfLoading.toLowerCase().includes(q) ||
        r.portOfDestination.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const open = filtered.find((r) => r.id === openId) ?? null;

  async function decide(id: string, decision: Decision) {
    if (deciding) return; // prevent double-submit
    setDeciding(id);
    try {
      await updateQuoteStatus(
        id,
        decision === "approved" ? "Approved" : "Rejected",
      );
      setDecisions((d) => ({ ...d, [id]: decision }));
      setOpenId(null);
      toast.success(
        decision === "approved" ? "Quote approved" : "Quote declined",
        { description: `${id} status updated in the system.` },
      );
      reload(); // re-sync list from Supabase
    } catch (err) {
      demoError(
        "Update failed",
        err instanceof Error ? err.message : "Could not update quote status.",
      );
    } finally {
      setDeciding(null);
    }
  }

  const header = (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
          {t("page.quotes.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.quotes.sub")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setNewQuoteOpen(true)}
        className="shrink-0 inline-flex items-center gap-1.5 h-9 rounded-lg bg-brand text-white px-3.5 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Plus className="h-4 w-4" /> New Quote
      </button>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading open quotes…" />
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
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((q, i) => (
            <QuoteCard
              key={q.id}
              q={q}
              index={i}
              decision={decisions[q.id]}
              onOpen={() => setOpenId(q.id)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <EmptyState
            title="No open quotes"
            description="Nothing awaiting review — new spot and contract rate requests will appear here."
            actionLabel="New Quote"
            onAction={() => setNewQuoteOpen(true)}
          />
        )}
      </div>

      <AnimatePresence>
        {open && (
          <QuoteDrawer
            q={open}
            decision={decisions[open.id]}
            deciding={deciding === open.id}
            onClose={() => setOpenId(null)}
            onDecide={decide}
          />
        )}
      </AnimatePresence>

      <NewQuoteModal
        open={newQuoteOpen}
        onClose={() => setNewQuoteOpen(false)}
        onCreated={reload}
      />
    </DashboardLayout>
  );
}

function DecisionChip({ decision }: { decision?: Decision }) {
  if (!decision) {
    return (
      <span className="rounded-full border border-border bg-foreground/[0.05] px-2 py-0.5 text-[0.62rem] font-semibold text-muted-foreground">
        Awaiting review
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
        decision === "approved"
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
          : "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
      )}
    >
      {decision === "approved" ? "Approved" : "Declined"}
    </span>
  );
}

function QuoteCard({
  q,
  index,
  decision,
  onOpen,
}: {
  q: Quote;
  index: number;
  decision?: Decision;
  onOpen: () => void;
}) {
  const { spot, contract } = rateFor(q);
  const Dir = q.direction === "Import" ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <motion.button
      layout
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.3) }}
      className="card-premium hover-lift rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-foreground">
          {q.id}
        </span>
        <DecisionChip decision={decision} />
      </div>
      <p className="mt-1.5 text-sm font-semibold text-foreground truncate">
        {q.customer}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Dir className="h-3 w-3 text-brand" />
        {q.portOfLoading} → {q.portOfDestination} · {q.container}
      </p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            Contract rate
          </p>
          <p className="font-display text-lg font-bold text-foreground tabular-nums">
            {eur(contract)}
          </p>
        </div>
        <p className="text-[0.7rem] text-muted-foreground">spot {eur(spot)}</p>
      </div>
    </motion.button>
  );
}

function QuoteDrawer({
  q,
  decision,
  deciding,
  onClose,
  onDecide,
}: {
  q: Quote;
  decision?: Decision;
  /** True while the approve/decline request is in-flight. */
  deciding: boolean;
  onClose: () => void;
  onDecide: (id: string, decision: Decision) => void;
}) {
  const t = useT();
  const { spot, contract } = rateFor(q);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Quote ${q.id}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full max-w-md glass-panel border-l flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
              <Ship className="h-4 w-4 text-brand" />
              {q.id}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{q.customer}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4 space-y-4">
          {/* Rate comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-brand/25 bg-brand/[0.05] p-3">
              <p className="text-[0.6rem] uppercase tracking-wider text-brand">
                Contract rate
              </p>
              <p className="mt-0.5 font-display text-xl font-bold text-foreground tabular-nums">
                {eur(contract)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-foreground/[0.03] p-3">
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Spot rate
              </p>
              <p className="mt-0.5 font-display text-xl font-bold text-foreground tabular-nums">
                {eur(spot)}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Detail
              label={t("col.route")}
              value={`${q.portOfLoading} → ${q.portOfDestination}`}
            />
            <Detail label="Direction" value={q.direction} />
            <Detail label={t("col.type")} value={q.container} />
            <Detail label="Incoterm" value={q.incoterm} />
            <Detail label="Urgency" value={q.urgency} />
            <Detail label="Requested" value={q.requestedAt} />
          </dl>

          <div>
            <p className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">
              Goods
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {q.goodsDescription}
            </p>
          </div>
        </div>

        {/* Action footer */}
        <div className="border-t border-border px-5 py-4">
          {decision ? (
            <p className="text-center text-sm font-medium text-muted-foreground">
              This quote was{" "}
              <span className="text-foreground font-semibold">{decision}</span>.
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDecide(q.id, "approved")}
                disabled={deciding}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_6px_18px_-8px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deciding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t("quote.approve")}
              </button>
              <button
                type="button"
                onClick={() => onDecide(q.id, "declined")}
                disabled={deciding}
                className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border bg-foreground/[0.03] px-4 text-sm font-medium text-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deciding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("quote.decline")}
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.62rem] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
