import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bot,
  FileCheck2,
  FileSearch,
  MailCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  ShieldAlert,
  Sparkles,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  getCustomerEmails,
  getFreeTimeStatus,
  getOceanShipments,
  useAsyncData,
  type CustomerEmail,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { useT, type I18nKey } from "@/lib/dashboard/i18n";
import { demoSuccess } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/automation/")({
  head: () => ({
    meta: [{ title: "Automation Center — Altun Logistics Operations" }],
  }),
  component: AutomationOverview,
});

interface AutomationData {
  shipments: OceanShipment[];
  emails: CustomerEmail[];
}

async function loadAutomation(): Promise<AutomationData> {
  const [shipments, emails] = await Promise.all([
    getOceanShipments(),
    getCustomerEmails(),
  ]);
  return { shipments, emails };
}

interface WorkflowDef {
  id: string;
  to: string;
  icon: typeof FileSearch;
  titleKey: I18nKey;
  descKey: I18nKey;
}

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "docs",
    to: "/dashboard/automation/document-completeness",
    icon: FileSearch,
    titleKey: "auto.wf.docs",
    descKey: "auto.wf.docs.desc",
  },
  {
    id: "delay",
    to: "/dashboard/automation/delay-risk",
    icon: Timer,
    titleKey: "auto.wf.delay",
    descKey: "auto.wf.delay.desc",
  },
  {
    id: "email",
    to: "/dashboard/automation/email-assistant",
    icon: MailCheck,
    titleKey: "auto.wf.email",
    descKey: "auto.wf.email.desc",
  },
];

function AutomationOverview() {
  const { data, loading, error, reload } = useAsyncData(loadAutomation, []);
  const { thresholds } = useDemurrageThresholds();
  const t = useT();

  const header = (
    <div className="mb-5">
      <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
        {t("auto.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auto.sub")}</p>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Booting AI workflows…" />
      </DashboardLayout>
    );
  }
  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Automation unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const { shipments, emails } = data;
  const docsMissing = shipments.filter((s) => s.customsBlock !== null).length;
  const highRisk = shipments.filter((s) => {
    const r = getFreeTimeStatus(s, thresholds).risk;
    return r === "critical" || r === "demurrage";
  }).length;
  const documentsChecked = shipments.length * 3 + 14;

  const wfData: Record<
    string,
    { scanned: number; status: string; tone: "ok" | "warn" | "risk" }
  > = {
    docs: {
      scanned: 38,
      status: `${docsMissing} document exceptions found`,
      tone: docsMissing > 0 ? "warn" : "ok",
    },
    delay: {
      scanned: shipments.length,
      status: `${highRisk} containers at demurrage risk`,
      tone: highRisk > 0 ? "risk" : "ok",
    },
    email: {
      scanned: emails.length,
      status: `${emails.length} AI drafts ready to send`,
      tone: "ok",
    },
  };

  return (
    <DashboardLayout>
      {header}

      <div className="flex gap-5">
        <CompanionDrawer docsMissing={docsMissing} highRisk={highRisk} />

        <div className="flex-1 min-w-0">
          {/* KPI AI readouts */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RingStat
              label={t("auto.kpi.active")}
              value={3}
              pct={1}
              icon={Activity}
            />
            <RingStat
              label={t("auto.kpi.docs")}
              value={documentsChecked}
              pct={0.92}
              icon={FileCheck2}
            />
            <RingStat
              label={t("auto.kpi.risk")}
              value={highRisk}
              pct={Math.min(highRisk / Math.max(shipments.length, 1), 1)}
              icon={ShieldAlert}
              tone="risk"
            />
            <RingStat
              label={t("auto.kpi.drafts")}
              value={emails.length}
              pct={0.7}
              icon={MailCheck}
            />
          </div>

          {/* Workflow cards */}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {WORKFLOWS.map((wf, i) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                index={i}
                data={wfData[wf.id]}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── AI Companion drawer ──────────────────────────────────── */

interface ChatMsg {
  from: "ai" | "user";
  text: string;
}

function CompanionDrawer({
  docsMissing,
  highRisk,
}: {
  docsMissing: number;
  highRisk: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);

  const chat: ChatMsg[] = [
    {
      from: "ai",
      text: `Morning Huseyin. ${docsMissing} bookings are missing customs documents — MSC Loreto and CMA CGM Bougainville need attention.`,
    },
    {
      from: "user",
      text: "Which one is most urgent?",
    },
    {
      from: "ai",
      text: `${highRisk} containers are inside the demurrage danger zone. Shall I contact the customers for the missing paperwork?`,
    },
  ];

  return (
    <motion.aside
      animate={{ width: open ? "19rem" : "3.25rem" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "shrink-0 rounded-2xl card-premium overflow-hidden flex flex-col",
        "h-[calc(100vh-13rem)]",
        "dark:shadow-[0_0_24px_-12px_var(--brand),inset_0_0_0_1px_oklch(0.6_0.16_254/0.12)]",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-border shrink-0">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-strong shrink-0 shadow-[0_0_18px_-4px_var(--brand)]">
          <Bot className="h-4 w-4 text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card status-pulse" />
        </span>
        {open && (
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-semibold text-foreground truncate">
              {t("auto.companion")}
            </p>
            <p className="text-[0.62rem] text-emerald-500 font-medium">
              Online · monitoring 14 containers
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse companion" : "Expand companion"}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Chat history */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-3 py-3 space-y-2.5">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    m.from === "ai"
                      ? "bg-brand/[0.08] border border-brand/15 text-foreground"
                      : "ml-auto bg-foreground/[0.06] text-foreground",
                  )}
                >
                  {m.text}
                </div>
              ))}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <QuickAction
                  label={t("auto.reviewDocs")}
                  onClick={() =>
                    demoSuccess(
                      "Opening review",
                      "AI compiled the missing-document list.",
                    )
                  }
                />
                <QuickAction
                  label={t("auto.contactCustomer")}
                  onClick={() =>
                    demoSuccess(
                      "Drafts queued",
                      "AI prepared chase-emails for each exporter.",
                    )
                  }
                />
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                demoSuccess("Sent to AI", "Companion is a preview prototype.");
                (
                  e.currentTarget.elements.namedItem("msg") as HTMLInputElement
                ).value = "";
              }}
              className="shrink-0 border-t border-border p-2.5 flex items-center gap-2"
            >
              <input
                name="msg"
                type="text"
                placeholder={t("auto.ask")}
                className="flex-1 h-9 rounded-lg border border-border bg-foreground/[0.03] px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-strong transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <Sparkles className="h-4 w-4 text-brand" />
        </div>
      )}
    </motion.aside>
  );
}

function QuickAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-brand/25 bg-brand/[0.06] px-2.5 h-7 text-[0.68rem] font-semibold text-brand hover:bg-brand/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {label}
    </button>
  );
}

/* ── KPI ring readout ─────────────────────────────────────── */

function RingStat({
  label,
  value,
  pct,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: number;
  pct: number;
  icon: typeof Activity;
  tone?: "brand" | "risk";
}) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const stroke =
    tone === "risk" ? "oklch(0.62 0.2 18)" : "oklch(0.52 0.18 254)";
  return (
    <div className="card-premium rounded-2xl p-4 flex items-center gap-3 dark:hover:shadow-[0_0_22px_-10px_var(--brand)] transition-shadow">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            strokeWidth="4"
            className="stroke-foreground/10"
          />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            strokeWidth="4"
            stroke={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, pct)))}
          />
        </svg>
        <Icon className="absolute inset-0 m-auto h-4 w-4 text-brand" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold text-foreground tabular-nums leading-none">
          {value.toLocaleString()}
        </p>
        <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ── Workflow navigation card ─────────────────────────────── */

function WorkflowCard({
  wf,
  index,
  data,
}: {
  wf: WorkflowDef;
  index: number;
  data: { scanned: number; status: string; tone: "ok" | "warn" | "risk" };
}) {
  const t = useT();
  const Icon = wf.icon;
  const dot =
    data.tone === "risk"
      ? "bg-rose-500"
      : data.tone === "warn"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        to={wf.to}
        className={cn(
          "group card-premium hover-lift rounded-2xl p-5 flex flex-col h-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "dark:hover:shadow-[0_0_28px_-10px_var(--brand),inset_0_0_0_1px_oklch(0.6_0.16_254/0.25)]",
        )}
      >
        <div className="flex items-center justify-between">
          <motion.span
            layoutId={`wf-icon-${wf.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_18px_-6px_var(--brand)]"
          >
            <Icon className="h-5 w-5 text-brand" />
          </motion.span>
          <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", dot)} />
            Live
          </span>
        </div>

        <h3 className="mt-4 font-display text-base font-bold text-foreground tracking-tight">
          {t(wf.titleKey)}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {t(wf.descKey)}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-foreground tabular-nums">
            {data.scanned}
          </span>
          <span className="text-[0.7rem] text-muted-foreground">
            {t("auto.scannedToday")}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-foreground/80">
          {data.status}
        </p>

        <span className="mt-4 inline-flex items-center gap-1 text-[0.78rem] font-semibold text-brand">
          {t("auto.viewDetails")}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </motion.div>
  );
}
