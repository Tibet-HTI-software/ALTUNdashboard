import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  FileCheck2,
  AlertTriangle,
  Mail,
  ListChecks,
  Activity,
  Sun,
  Cog,
  ShieldCheck,
  Bot,
  Wand2,
  ClipboardCheck,
  Send,
  Clock,
  Copy,
  Power,
  Plus,
  X,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import {
  StatusBadge,
  priorityTone,
  type StatusTone,
} from "@/components/dashboard/StatusBadge";
import {
  createAutomationTask,
  getAutomationCenter,
  markSuggestionReviewed,
  runAutomationWorkflow,
  useAsyncData,
} from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { demoAction, demoSuccess, demoError } from "@/lib/dashboard/demo";
/*
 * Mock data is still imported here so the drawer renderers (WorkflowDrawer,
 * EventDrawer, SuggestionDrawer, DraftDrawer, RulesDrawer) can read static
 * fixtures by reference. The service-layer call below (`getAutomationCenter`)
 * still runs so the page exercises the async fetch path and surfaces
 * loading / error states. When a real backend lands, drop these imports and
 * thread `data` through the drawer renderers via context or props.
 */
import {
  automationKpis,
  automationWorkflows,
  automationEvents,
  automationSuggestions,
  automationRules,
  automationDraftEmail,
} from "@/data/dashboard/automation";
import type {
  AutomationCategory,
  AutomationEvent,
  AutomationStatus,
  AutomationSuggestion,
  AutomationWorkflow,
} from "@/lib/dashboard/types";

export const Route = createFileRoute("/dashboard/automation")({
  head: () => ({
    meta: [{ title: "Automation Center — Altun Logistics Operations" }],
  }),
  component: AutomationPage,
});

/* ── helpers ──────────────────────────────────────────────────────── */

const KPI_ICONS: LucideIcon[] = [Bot, FileCheck2, AlertTriangle, Mail];

const CATEGORY_ICON: Record<AutomationCategory, LucideIcon> = {
  Documents: FileCheck2,
  Risk: ShieldCheck,
  Quotes: ClipboardCheck,
  Communication: Mail,
  Operations: Sun,
  Tasks: ListChecks,
};

const EVENT_ICON: Record<AutomationEvent["kind"], LucideIcon> = {
  "document-check": FileCheck2,
  "risk-flag": AlertTriangle,
  "quote-prepared": ClipboardCheck,
  "email-draft": Mail,
  "warehouse-route": Activity,
  "task-created": ListChecks,
};

const EVENT_TONE: Record<AutomationEvent["kind"], StatusTone> = {
  "document-check": "brand",
  "risk-flag": "danger",
  "quote-prepared": "info",
  "email-draft": "brand",
  "warehouse-route": "warning",
  "task-created": "neutral",
};

function statusTone(s: AutomationStatus): StatusTone {
  switch (s) {
    case "Active":
      return "success";
    case "Draft":
      return "warning";
    case "Paused":
      return "neutral";
  }
}

/**
 * Static "last run" text per workflow id. Backend would compute this from a
 * runs table — for the prototype we hardcode realistic relative times.
 */
const LAST_RUN: Record<string, string> = {
  "wf-doc-check": "2 min ago",
  "wf-delay-risk": "14 min ago",
  "wf-quote-prep": "31 min ago",
  "wf-email-draft": "48 min ago",
  "wf-daily-summary": "Today 08:00",
  "wf-task-rules": "1 h ago",
};

/**
 * Sample/example output text shown in the workflow drawer. Strings only —
 * a real automation engine would return structured data per workflow.
 */
const WORKFLOW_SAMPLE: Record<string, string> = {
  "wf-doc-check":
    "Customs file CF-2026-0231: Insurance Certificate missing — risk High. Suggest customer email + escalation to Customs team.",
  "wf-delay-risk":
    "Shipment AL-2026-1048 delay risk score 78/100. Driver: extended customs inspection window. Recommend customer notification within 4h.",
  "wf-quote-prep":
    "Quote Q-2026-0512 draft prepared: Sea FCL · 40HC · FOB · Antwerp → Istanbul Ambarli. Suggested rate range and required docs attached.",
  "wf-email-draft":
    "Customer asks for an ETA update on shipment AL-2026-1048. Assistant summarizes the request and drafts a reply confirming the delay and expected update window.",
  "wf-daily-summary":
    "Morning summary: 4 high-risk shipments · 2 customs SLAs at risk · Zone C at 92% · 11 quote requests pending review.",
  "wf-task-rules":
    "22 events processed · 8 tasks created · 3 customer notifications drafted · 1 capacity alert routed to Operations.",
};

/**
 * Suggested next action per workflow id — surfaced in the workflow drawer.
 */
const WORKFLOW_NEXT: Record<string, string> = {
  "wf-doc-check":
    "Review the 4 customs files flagged today and trigger missing-document emails.",
  "wf-delay-risk":
    "Confirm customer notification for AL-2026-1048 before vessel cut-off.",
  "wf-quote-prep":
    "Approve or revise Q-2026-0512 draft — currently sitting at the SLA boundary.",
  "wf-email-draft": "Review the generated reply and send it to the customer.",
  "wf-daily-summary": "Share digest with Operations channel by 09:00.",
  "wf-task-rules":
    "Audit auto-created tasks at end of day; tune rule thresholds if false positives appear.",
};

/* ── drawer state types ───────────────────────────────────────────── */

type DrawerView =
  | { kind: "workflow"; id: string }
  | { kind: "event"; id: string }
  | { kind: "suggestion"; id: string }
  | { kind: "draft" }
  | { kind: "rules" };

/* ── tab nav config ───────────────────────────────────────────────── */

type AutomationTab =
  | "workflows"
  | "activity"
  | "suggestions"
  | "drafts"
  | "rules";

interface TabDef {
  key: AutomationTab;
  label: string;
  count: number;
  helper: string;
}

/** Static count for the drafts pile. Same value the summary card surfaces. */
const DRAFTS_READY_COUNT = 11;

/**
 * Workflows surfaced in the main Workflow Library view. The full mock
 * dataset still backs drawer lookups (workflow → drawer detail), but the
 * library section only shows these three core automations.
 */
const VISIBLE_WORKFLOW_IDS = [
  "wf-doc-check",
  "wf-delay-risk",
  "wf-email-draft",
];

const visibleWorkflows = automationWorkflows.filter((w) =>
  VISIBLE_WORKFLOW_IDS.includes(w.id),
);

/* ── page ─────────────────────────────────────────────────────────── */

function AutomationPage() {
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [activeTab, setActiveTab] = useState<AutomationTab>("workflows");
  const close = () => setDrawer(null);

  // Exercise the service layer for the page-level load/error path even
  // though static imports above still feed the drawer renderers.
  const center = useAsyncData(getAutomationCenter, []);

  const openWorkflowId = drawer?.kind === "workflow" ? drawer.id : null;

  const TABS: TabDef[] = [
    {
      key: "workflows",
      label: "Workflows",
      count: visibleWorkflows.length,
      helper:
        "Choose a workflow to review logic, inputs, outputs, and recent runs.",
    },
    {
      key: "activity",
      label: "Activity",
      count: automationEvents.slice(0, 5).length,
      helper: "Monitor the latest automation events across operations.",
    },
    {
      key: "suggestions",
      label: "Suggestions",
      count: automationSuggestions.length,
      helper: "Review automation suggestions before taking action.",
    },
    {
      key: "drafts",
      label: "Drafts",
      count: DRAFTS_READY_COUNT,
      helper: "Review generated customer messages before sending.",
    },
    {
      key: "rules",
      label: "Rules",
      count: automationRules.length,
      helper: "Manage triggers, conditions, actions, and owners.",
    },
  ];

  const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  if (center.loading) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Automation Center"
          description="AI-assisted workflows for customs checks, shipment risks, quote preparation, and customer communication."
          crumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Automation Center" },
          ]}
        />
        <LoadingState label="Loading automation center…" />
      </DashboardLayout>
    );
  }

  if (center.error) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Automation Center"
          description="AI-assisted workflows for customs checks, shipment risks, quote preparation, and customer communication."
          crumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Automation Center" },
          ]}
        />
        <ErrorState error={center.error} onRetry={center.reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Automation Center"
        description="AI-assisted workflows for customs checks, shipment risks, quote preparation, and customer communication."
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Automation Center" },
        ]}
        actions={
          <>
            <button
              type="button"
              onClick={() => setDrawer({ kind: "rules" })}
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
            >
              <Cog className="h-3.5 w-3.5" /> Manage rules
            </button>
            <button
              type="button"
              onClick={() =>
                demoAction("this would trigger all active workflows on demand.")
              }
              className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" /> Run workflows
            </button>
          </>
        }
      />

      {/* Prototype disclaimer — quiet but clear */}
      <div className="mb-5 flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
        <p>Prototype mode — automation actions are demo-only.</p>
      </div>

      {/* 1. KPI cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {automationKpis.map((k, i) => (
          <KPIStatCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            icon={KPI_ICONS[i]}
          />
        ))}
      </div>

      {/* Tab bar — pill style, scrolls on mobile */}
      <div
        role="tablist"
        aria-label="Automation sections"
        className="mb-3 -mx-1 overflow-x-auto"
      >
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-card)] mx-1 min-w-max">
          {TABS.map((t) => {
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-2 h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand whitespace-nowrap ${
                  active
                    ? "bg-brand text-white shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-navy-deep hover:bg-secondary/60"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.6rem] font-semibold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Helper line under tabs */}
      <p className="mb-5 text-xs text-muted-foreground">{currentTab.helper}</p>

      {/* 2. Automation Workflows */}
      {activeTab === "workflows" && (
        <section>
          <header className="mb-3 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display font-bold text-navy-deep text-lg">
                Automation Workflows
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open a workflow to review inputs, outputs, recent events, and
                actions.
              </p>
            </div>
          </header>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleWorkflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                open={openWorkflowId === wf.id}
                onOpen={() => setDrawer({ kind: "workflow", id: wf.id })}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Recent Automation Activity */}
      {activeTab === "activity" && (
        <section className="card-premium rounded-2xl p-5">
          <header className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display font-bold text-navy-deep text-base">
                Recent Automation Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest workflow events across customs, shipments, quotes, and
                warehouse.
              </p>
            </div>
            <StatusBadge tone="success" dot>
              Streaming
            </StatusBadge>
          </header>

          <ol className="relative">
            {automationEvents.slice(0, 5).map((e, i, arr) => {
              const Icon = EVENT_ICON[e.kind];
              const tone = EVENT_TONE[e.kind];
              const isLast = i === arr.length - 1;
              return (
                <li key={e.id} className="relative">
                  {!isLast && (
                    <span
                      className="absolute left-[1.125rem] top-7 w-px h-[calc(100%-1rem)] bg-border"
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setDrawer({ kind: "event", id: e.id })}
                    className="w-full text-left relative pl-10 pr-3 py-2 -mx-2 rounded-md hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span
                      className="absolute left-0 top-2 h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center text-brand"
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-navy-deep">
                        {e.message}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {e.at}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 flex-wrap">
                      {e.detail && (
                        <span className="text-xs text-muted-foreground">
                          {e.detail}
                        </span>
                      )}
                      {e.related && (
                        <StatusBadge tone={tone} className="text-[0.6rem]">
                          {e.related}
                        </StatusBadge>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* 4. AI Suggestions */}
      {activeTab === "suggestions" && (
        <section className="card-premium rounded-2xl p-5">
          <header className="mb-4">
            <h2 className="font-display font-bold text-navy-deep text-base">
              AI Suggestions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recommended next actions based on current operational state.
            </p>
          </header>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {automationSuggestions.map((s) => (
              <SuggestionItem
                key={s.id}
                suggestion={s}
                onOpen={() => setDrawer({ kind: "suggestion", id: s.id })}
              />
            ))}
          </ul>
        </section>
      )}

      {/* 5. Draft Messages */}
      {activeTab === "drafts" && (
        <section className="card-premium rounded-2xl p-5 flex flex-col max-w-2xl">
          <header className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="font-display font-bold text-navy-deep text-base">
                Draft Messages
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer drafts waiting for staff review.
              </p>
            </div>
            <StatusBadge tone="brand" dot>
              AI Draft
            </StatusBadge>
          </header>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-navy-deep tabular-nums">
              {DRAFTS_READY_COUNT}
            </span>
            <span className="text-xs text-muted-foreground">drafts ready</span>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5 text-xs flex-1">
            <p className="text-[0.65rem] uppercase tracking-widest font-semibold text-muted-foreground">
              Latest draft
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-deep leading-snug">
              {automationDraftEmail.subject}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              For {automationDraftEmail.customer}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDrawer({ kind: "draft" })}
            className="mt-4 self-start inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            Review draft
          </button>
        </section>
      )}

      {/* 6. Automation Rules */}
      {activeTab === "rules" && (
        <section className="card-premium rounded-2xl p-5 flex flex-col max-w-2xl">
          <header className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="font-display font-bold text-navy-deep text-base">
                Automation Rules
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Operational triggers and the actions they create.
              </p>
            </div>
          </header>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-navy-deep tabular-nums">
              {automationRules.length}
            </span>
            <span className="text-xs text-muted-foreground">total rules</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs flex-1">
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <dt className="text-[0.65rem] uppercase tracking-widest font-semibold text-muted-foreground">
                Active
              </dt>
              <dd className="mt-0.5 font-display text-xl font-bold text-emerald-600 tabular-nums">
                {automationRules.filter((r) => r.status === "Active").length}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <dt className="text-[0.65rem] uppercase tracking-widest font-semibold text-muted-foreground">
                Draft
              </dt>
              <dd className="mt-0.5 font-display text-xl font-bold text-amber-600 tabular-nums">
                {automationRules.filter((r) => r.status === "Draft").length}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setDrawer({ kind: "rules" })}
            className="mt-4 self-start inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
          >
            <Cog className="h-3.5 w-3.5" /> Manage rules
          </button>
        </section>
      )}

      {/* Detail drawer */}
      <Drawer view={drawer} onClose={close} />
    </DashboardLayout>
  );
}

/* ── workflow card ────────────────────────────────────────────────── */

function WorkflowCard({
  wf,
  open,
  onOpen,
}: {
  wf: AutomationWorkflow;
  open: boolean;
  onOpen: () => void;
}) {
  const Icon = CATEGORY_ICON[wf.category];
  const lastRun = LAST_RUN[wf.id] ?? "—";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-pressed={open}
      className={`group rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] flex flex-col cursor-pointer transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        open
          ? "border-brand/60 ring-1 ring-brand/20"
          : "border-border hover:border-brand/40"
      }`}
    >
      <header className="flex items-start gap-3 mb-3">
        <div className="h-9 w-9 rounded-md bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-navy-deep text-sm leading-tight">
            {wf.name}
          </h3>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">
            {wf.category}
          </p>
        </div>
        <StatusBadge tone={statusTone(wf.status)} dot>
          {wf.status}
        </StatusBadge>
      </header>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
        {wf.description}
      </p>

      <dl className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div>
          <dt className="text-[0.6rem] uppercase tracking-widest font-semibold text-muted-foreground">
            Runs today
          </dt>
          <dd className="mt-0.5 font-display text-base font-bold text-navy-deep tabular-nums">
            {wf.runsToday}
          </dd>
        </div>
        <div>
          <dt className="text-[0.6rem] uppercase tracking-widest font-semibold text-muted-foreground">
            Last run
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-navy-deep">
            {lastRun}
          </dd>
        </div>
      </dl>

      <footer className="mt-auto flex items-center gap-2 pt-3 border-t border-border">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="inline-flex items-center gap-1 h-8 rounded-md bg-brand text-white px-3 text-xs font-medium hover:bg-brand-strong transition-colors flex-1 justify-center"
        >
          Open workflow <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const result = await runAutomationWorkflow(wf.id);
              demoSuccess("Workflow run complete", result.output);
            } catch (err) {
              demoError(
                "Workflow run failed",
                err instanceof Error ? err.message : "Failed to run workflow.",
              );
            }
          }}
          className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Wand2 className="h-3 w-3" /> Run demo
        </button>
      </footer>
    </article>
  );
}

/* ── suggestion item ──────────────────────────────────────────────── */

function SuggestionItem({
  suggestion,
  onOpen,
}: {
  suggestion: AutomationSuggestion;
  onOpen: () => void;
}) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="rounded-lg border border-border bg-secondary/30 p-3.5 cursor-pointer transition-colors hover:bg-secondary/50 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <p className="text-sm font-semibold text-navy-deep leading-tight">
            {suggestion.title}
          </p>
          <StatusBadge tone={priorityTone(suggestion.priority)} dot>
            {suggestion.priority}
          </StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {suggestion.reason}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.65rem] font-mono text-muted-foreground">
            {suggestion.related}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="inline-flex items-center gap-1 h-8 rounded-md bg-brand text-white px-3 text-xs font-medium hover:bg-brand-strong transition-colors"
          >
            Review <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </li>
  );
}

/* ── drawer ───────────────────────────────────────────────────────── */

interface DrawerProps {
  view: DrawerView | null;
  onClose: () => void;
}

/**
 * Right-side slide-over on lg+, full-screen sheet below. Backdrop click and
 * ESC close the drawer. Body scroll is locked while the drawer is open and
 * restored on close/unmount.
 *
 * No focus trap to keep scope small for the prototype — flag for prod.
 */
function Drawer({ view, onClose }: DrawerProps) {
  const open = view !== null;

  // ESC to close + body-scroll lock.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Automation detail"
        className={`absolute inset-y-0 right-0 w-full lg:w-[36rem] xl:w-[40rem] bg-card shadow-[var(--shadow-elevated)] flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {view && <DrawerContent view={view} onClose={onClose} />}
      </aside>
    </div>
  );
}

function DrawerHeader({
  overline,
  title,
  badge,
  onClose,
}: {
  overline: string;
  title: string;
  badge?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="px-5 lg:px-6 py-4 border-b border-border flex items-start gap-3 shrink-0">
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] uppercase tracking-widest font-semibold text-brand">
          {overline}
        </p>
        <h2 className="mt-1 font-display font-bold text-navy-deep text-lg leading-tight">
          {title}
        </h2>
        {badge && <div className="mt-2">{badge}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="p-2 -mr-2 rounded-md hover:bg-secondary/50 text-navy-deep transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}

function DrawerContent({
  view,
  onClose,
}: {
  view: DrawerView;
  onClose: () => void;
}) {
  if (view.kind === "workflow") {
    const wf = automationWorkflows.find((w) => w.id === view.id);
    if (!wf)
      return (
        <DrawerHeader overline="Workflow" title="Not found" onClose={onClose} />
      );
    return <WorkflowDrawer wf={wf} onClose={onClose} />;
  }
  if (view.kind === "event") {
    const ev = automationEvents.find((e) => e.id === view.id);
    if (!ev)
      return (
        <DrawerHeader overline="Event" title="Not found" onClose={onClose} />
      );
    return <EventDrawer ev={ev} onClose={onClose} />;
  }
  if (view.kind === "suggestion") {
    const sg = automationSuggestions.find((s) => s.id === view.id);
    if (!sg)
      return (
        <DrawerHeader
          overline="Suggestion"
          title="Not found"
          onClose={onClose}
        />
      );
    return <SuggestionDrawer sg={sg} onClose={onClose} />;
  }
  if (view.kind === "draft") {
    return <DraftDrawer onClose={onClose} />;
  }
  return <RulesDrawer onClose={onClose} />;
}

/* ── workflow drawer ──────────────────────────────────────────────── */

function WorkflowDrawer({
  wf,
  onClose,
}: {
  wf: AutomationWorkflow;
  onClose: () => void;
}) {
  const lastRun = LAST_RUN[wf.id] ?? "—";
  const sample = WORKFLOW_SAMPLE[wf.id] ?? "Sample output not available.";
  const next = WORKFLOW_NEXT[wf.id] ?? "—";
  const related = automationEvents.filter((e) => workflowMatchesEvent(wf, e));

  return (
    <>
      <DrawerHeader
        overline={`Workflow · ${wf.category}`}
        title={wf.name}
        badge={
          <StatusBadge tone={statusTone(wf.status)} dot>
            {wf.status}
          </StatusBadge>
        }
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5 text-sm">
        <p className="text-sm text-navy-deep leading-relaxed">
          {wf.description}
        </p>

        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Runs today" value={wf.runsToday.toString()} />
          <Stat label="Last run" value={lastRun} />
        </dl>

        <DrawerSection title="Inputs">
          <ul className="flex flex-wrap gap-1.5">
            {wf.inputs.map((inp) => (
              <li
                key={inp}
                className="inline-block rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-[0.7rem] text-navy-deep"
              >
                {inp}
              </li>
            ))}
          </ul>
        </DrawerSection>

        <DrawerSection title="Outputs">
          <ul className="flex flex-wrap gap-1.5">
            {wf.outputs.map((out) => (
              <li
                key={out}
                className="inline-block rounded-full bg-brand-soft text-brand px-2.5 py-0.5 text-[0.7rem]"
              >
                {out}
              </li>
            ))}
          </ul>
        </DrawerSection>

        <DrawerSection title="Example result">
          <p className="text-xs text-navy-deep bg-secondary/40 border border-border rounded-md px-3.5 py-3 leading-relaxed">
            {sample}
          </p>
        </DrawerSection>

        <DrawerSection title="Suggested next action">
          <p className="text-xs text-navy-deep leading-relaxed">{next}</p>
        </DrawerSection>

        <DrawerSection title="Recent related events">
          {related.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No related events in the recent feed.
            </p>
          ) : (
            <ul className="space-y-2">
              {related.map((e) => {
                const Icon = EVENT_ICON[e.kind];
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/30 px-3 py-2"
                  >
                    <Icon className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-navy-deep">
                        {e.message}
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground">
                        {e.at}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DrawerSection>
      </div>

      <footer className="px-5 lg:px-6 py-4 border-t border-border flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await runAutomationWorkflow(wf.id);
              demoSuccess("Workflow run complete", result.output);
            } catch (err) {
              demoError(
                "Workflow run failed",
                err instanceof Error ? err.message : "Failed to run workflow.",
              );
            }
          }}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          <Wand2 className="h-3.5 w-3.5" /> Run demo
        </button>
        <button
          type="button"
          onClick={() =>
            demoAction(
              wf.status === "Active"
                ? `this would pause "${wf.name}".`
                : `this would enable "${wf.name}".`,
            )
          }
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Power className="h-3.5 w-3.5" />{" "}
          {wf.status === "Active" ? "Pause" : "Enable"}
        </button>
        <button
          type="button"
          onClick={() =>
            demoAction(`this would open the rule editor for "${wf.name}".`)
          }
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Cog className="h-3.5 w-3.5" /> Edit rule
        </button>
      </footer>
    </>
  );
}

/** Heuristic: link an event to a workflow by category/kind affinity. */
function workflowMatchesEvent(
  wf: AutomationWorkflow,
  e: AutomationEvent,
): boolean {
  const map: Record<AutomationEvent["kind"], AutomationCategory> = {
    "document-check": "Documents",
    "risk-flag": "Risk",
    "quote-prepared": "Quotes",
    "email-draft": "Communication",
    "warehouse-route": "Operations",
    "task-created": "Tasks",
  };
  return map[e.kind] === wf.category;
}

/* ── event drawer ─────────────────────────────────────────────────── */

function EventDrawer({
  ev,
  onClose,
}: {
  ev: AutomationEvent;
  onClose: () => void;
}) {
  const Icon = EVENT_ICON[ev.kind];
  const tone = EVENT_TONE[ev.kind];
  const nextStep = nextStepForEvent(ev);

  return (
    <>
      <DrawerHeader
        overline="Automation event"
        title={ev.message}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={tone}>{prettyKind(ev.kind)}</StatusBadge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {ev.at}
            </span>
          </div>
        }
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5 text-sm">
        <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 px-4 py-3">
          <Icon className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            {ev.detail && (
              <p className="text-sm text-navy-deep leading-relaxed">
                {ev.detail}
              </p>
            )}
            {ev.related && (
              <p className="mt-2 text-[0.7rem] text-muted-foreground">
                Related:{" "}
                <span className="font-mono font-semibold text-navy-deep">
                  {ev.related}
                </span>
              </p>
            )}
          </div>
        </div>

        <DrawerSection title="Recommended next step">
          <p className="text-xs text-navy-deep leading-relaxed">{nextStep}</p>
        </DrawerSection>
      </div>

      <footer className="px-5 lg:px-6 py-4 border-t border-border flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={() =>
            demoAction(`this would open record ${ev.related ?? ev.id}.`)
          }
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          Open related record
        </button>
        <button
          type="button"
          onClick={() =>
            demoAction(`this would create a follow-up task for event ${ev.id}.`)
          }
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <ListChecks className="h-3.5 w-3.5" /> Create task
        </button>
      </footer>
    </>
  );
}

function prettyKind(k: AutomationEvent["kind"]): string {
  switch (k) {
    case "document-check":
      return "Document check";
    case "risk-flag":
      return "Risk flag";
    case "quote-prepared":
      return "Quote prepared";
    case "email-draft":
      return "Email draft";
    case "warehouse-route":
      return "Warehouse alert";
    case "task-created":
      return "Task created";
  }
}

function nextStepForEvent(e: AutomationEvent): string {
  switch (e.kind) {
    case "document-check":
      return "Review the customs file and request the missing document from the customer.";
    case "risk-flag":
      return "Confirm carrier ETA, then notify the customer if delay risk persists.";
    case "quote-prepared":
      return "Open the prepared draft, validate pricing, and send to the customer.";
    case "email-draft":
      return "Open the draft, edit if needed, then send to the customer.";
    case "warehouse-route":
      return "Coordinate with Operations to free capacity in the affected zone.";
    case "task-created":
      return "Assign the task to the responsible owner and set a due date.";
  }
}

/* ── suggestion drawer ────────────────────────────────────────────── */

function SuggestionDrawer({
  sg,
  onClose,
}: {
  sg: AutomationSuggestion;
  onClose: () => void;
}) {
  return (
    <>
      <DrawerHeader
        overline="AI Suggestion"
        title={sg.title}
        badge={
          <StatusBadge tone={priorityTone(sg.priority)} dot>
            {sg.priority}
          </StatusBadge>
        }
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5 text-sm">
        <DrawerSection title="Reason">
          <p className="text-sm text-navy-deep leading-relaxed">{sg.reason}</p>
        </DrawerSection>

        <DrawerSection title="Related record">
          <p className="font-mono text-sm font-semibold text-navy-deep">
            {sg.related}
          </p>
        </DrawerSection>

        <DrawerSection title="Recommended action">
          <p className="text-sm text-navy-deep">{sg.action}</p>
        </DrawerSection>

        <DrawerSection title="Operational impact">
          <p className="text-xs text-navy-deep leading-relaxed">
            {sg.priority === "Urgent"
              ? "Blocking issue — failing to act risks customs delay or missed vessel cut-off."
              : sg.priority === "High"
                ? "Time-sensitive — best handled the same business day."
                : "Quality-of-service improvement — schedule alongside other work."}
          </p>
        </DrawerSection>
      </div>

      <footer className="px-5 lg:px-6 py-4 border-t border-border flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={() =>
            demoAction(`this would draft an email related to ${sg.related}.`)
          }
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          <Mail className="h-3.5 w-3.5" /> Draft email
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await createAutomationTask({
                source: "suggestion",
                sourceId: sg.id,
                title: sg.title,
              });
              demoSuccess(
                "Task created",
                `Task ${result.taskId} created from suggestion ${sg.id}.`,
              );
            } catch (err) {
              demoError(
                "Could not create task",
                err instanceof Error ? err.message : "Failed to create task.",
              );
            }
          }}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <ListChecks className="h-3.5 w-3.5" /> Create task
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await markSuggestionReviewed(sg.id);
              demoSuccess(
                "Suggestion reviewed",
                `Suggestion ${sg.id} marked reviewed.`,
              );
            } catch (err) {
              demoError(
                "Could not mark reviewed",
                err instanceof Error ? err.message : "Failed to mark reviewed.",
              );
            }
          }}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <ClipboardCheck className="h-3.5 w-3.5" /> Mark reviewed
        </button>
      </footer>
    </>
  );
}

/* ── draft drawer ─────────────────────────────────────────────────── */

function DraftDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <DrawerHeader
        overline="Draft message"
        title={automationDraftEmail.subject}
        badge={
          <StatusBadge tone="brand" dot>
            AI Draft
          </StatusBadge>
        }
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-[5rem_1fr] text-xs">
          <dt className="font-semibold text-muted-foreground uppercase tracking-widest">
            To
          </dt>
          <dd className="text-navy-deep">
            {automationDraftEmail.customer}{" "}
            <span className="text-muted-foreground">
              &lt;{automationDraftEmail.to}&gt;
            </span>
          </dd>
          <dt className="font-semibold text-muted-foreground uppercase tracking-widest">
            Subject
          </dt>
          <dd className="text-navy-deep font-semibold">
            {automationDraftEmail.subject}
          </dd>
          <dt className="font-semibold text-muted-foreground uppercase tracking-widest">
            Related
          </dt>
          <dd className="text-navy-deep font-mono text-xs">AL-2026-1045</dd>
        </dl>

        <pre className="whitespace-pre-wrap font-sans text-sm text-navy-deep bg-secondary/40 border border-border rounded-md px-4 py-3 leading-relaxed">
          {automationDraftEmail.body}
        </pre>
      </div>

      <footer className="px-5 lg:px-6 py-4 border-t border-border flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => demoAction("draft would be copied to clipboard.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Copy className="h-3.5 w-3.5" /> Copy draft
        </button>
        <button
          type="button"
          onClick={() => demoAction("draft would be flagged for staff review.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <ClipboardCheck className="h-3.5 w-3.5" /> Mark for review
        </button>
        <button
          type="button"
          onClick={() => demoAction("draft would be scheduled for later send.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Clock className="h-3.5 w-3.5" /> Send later
        </button>
        <button
          type="button"
          onClick={() =>
            demoAction("draft would be sent through Altun mail gateway.")
          }
          className="ml-auto inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          <Send className="h-3.5 w-3.5" /> Send to customer
        </button>
      </footer>
    </>
  );
}

/* ── rules drawer ─────────────────────────────────────────────────── */

function RulesDrawer({ onClose }: { onClose: () => void }) {
  const total = automationRules.length;
  const active = automationRules.filter((r) => r.status === "Active").length;
  const draft = automationRules.filter((r) => r.status === "Draft").length;

  return (
    <>
      <DrawerHeader
        overline="Automation rules"
        title="Rule manager"
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5 text-sm">
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={total.toString()} />
          <Stat label="Active" value={active.toString()} accent="emerald" />
          <Stat label="Draft" value={draft.toString()} accent="amber" />
        </dl>

        <DrawerSection title="Rules">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Trigger
                  </th>
                  <th className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Condition
                  </th>
                  <th className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Action
                  </th>
                  <th className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Owner
                  </th>
                  <th className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    {""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {automationRules.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-semibold text-navy-deep">
                      {r.trigger}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.condition}
                    </td>
                    <td className="px-3 py-2.5 text-navy-deep">{r.action}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone="info" className="text-[0.6rem]">
                        {r.owner}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={statusTone(r.status)} dot>
                        {r.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          demoAction(`this would edit rule "${r.trigger}".`)
                        }
                        className="text-[0.7rem] font-semibold text-brand hover:underline underline-offset-4"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DrawerSection>
      </div>

      <footer className="px-5 lg:px-6 py-4 border-t border-border flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => demoAction("this would open the new rule form.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Create new rule
        </button>
        <button
          type="button"
          onClick={() => demoAction("this would toggle all rules at once.")}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.05] transition-colors"
        >
          <Power className="h-3.5 w-3.5" /> Toggle all
        </button>
      </footer>
    </>
  );
}

/* ── small drawer primitives ──────────────────────────────────────── */

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[0.65rem] uppercase tracking-widest font-semibold text-brand mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-navy-deep";
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-3 py-2.5">
      <div className="text-[0.6rem] uppercase tracking-widest font-semibold text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 font-display text-xl font-bold tabular-nums ${tone}`}
      >
        {value}
      </div>
    </div>
  );
}
