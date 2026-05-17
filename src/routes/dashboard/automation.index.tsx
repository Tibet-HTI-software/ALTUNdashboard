import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { useUiSounds } from "@/hooks/useUiSounds";
import { ShipmentTrackingCard } from "@/components/dashboard/ShipmentTrackingCard";

export const Route = createFileRoute("/dashboard/automation/")({
  head: () => ({
    meta: [{ title: "Automation Center — Altun Logistics Operations" }],
  }),
  component: AutomationOverview,
});

/**
 * Premium surface — crisp white paper card in light mode, deep desaturated
 * gradient with a faint neon edge-glow in dark mode (Linear/Vercel vibe).
 */
const PREMIUM_CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm " +
  "dark:border-white/[0.06] dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 " +
  "dark:shadow-[0_0_28px_-18px_rgba(56,189,248,0.55)]";

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
    <div className="mb-4 shrink-0">
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
        {t("auto.title")}
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("auto.sub")}</p>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout lockViewport>
        {header}
        <LoadingState label="Booting AI workflows…" />
      </DashboardLayout>
    );
  }
  if (error || !data) {
    return (
      <DashboardLayout lockViewport>
        {header}
        <ErrorState
          error={error ?? new Error("Automation unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const { shipments, emails } = data;
  const total = shipments.length;
  const docsMissing = shipments.filter((s) => s.customsBlock !== null).length;

  let highRisk = 0;
  let warning = 0;
  for (const s of shipments) {
    const r = getFreeTimeStatus(s, thresholds).risk;
    if (r === "critical" || r === "demurrage") highRisk += 1;
    else if (r === "warning") warning += 1;
  }
  const documentsChecked = total * 3 + 14;
  const completeFilled = Math.round(((total - docsMissing) / total) * 10);

  const wfData: Record<
    string,
    { scanned: number; status: string; tone: Tone; micro: ReactNode }
  > = {
    docs: {
      scanned: 38,
      status: `${docsMissing} document exceptions found`,
      tone: docsMissing > 0 ? "warn" : "ok",
      micro: <SegmentBar filled={completeFilled} total={10} />,
    },
    delay: {
      scanned: total,
      status: `${highRisk} containers at demurrage risk`,
      tone: highRisk > 0 ? "risk" : "ok",
      micro: (
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="rose">{highRisk} High risk</Pill>
          <Pill tone="amber">{warning} Warning</Pill>
          <Pill tone="emerald">{total - highRisk - warning} Healthy</Pill>
        </div>
      ),
    },
    email: {
      scanned: emails.length,
      status: `${emails.length} AI drafts ready to send`,
      tone: "ok",
      micro: (
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="sky">{emails.length} Drafts ready</Pill>
          <Pill tone="emerald">Auto-fill on</Pill>
        </div>
      ),
    },
  };

  return (
    <DashboardLayout lockViewport>
      {header}

      <div className="flex gap-5 flex-1 min-h-0 min-w-0 overflow-x-hidden">
        <CompanionDrawer docsMissing={docsMissing} highRisk={highRisk} />

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* KPI AI readouts */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 shrink-0">
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
              pct={Math.min(highRisk / Math.max(total, 1), 1)}
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

          {/* Workflow cards — stretch to fill the column height */}
          <div className="grid gap-4 lg:grid-cols-3 flex-1 min-h-0">
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

/* ── Micro-components ─────────────────────────────────────── */

type Tone = "ok" | "warn" | "risk";

function SegmentBar({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i < filled
              ? "bg-brand dark:shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              : "bg-slate-200 dark:bg-white/[0.07]",
          )}
        />
      ))}
    </div>
  );
}

const PILL_TONE = {
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
} as const;

function Pill({
  tone,
  children,
}: {
  tone: keyof typeof PILL_TONE;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        PILL_TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ── AI Companion drawer (Generative UI) ──────────────────── */

interface ChatMsg {
  id: number;
  from: "ai" | "user";
  text?: string;
  /** When true the bubble renders the live ShipmentTrackingCard. */
  card?: boolean;
}

function CompanionDrawer({
  docsMissing,
  highRisk,
}: {
  docsMissing: number;
  highRisk: number;
}) {
  const t = useT();
  const { playSuccess } = useUiSounds();
  const [open, setOpen] = useState(true);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 1,
      from: "ai",
      text: `Morning Huseyin. ${docsMissing} bookings are missing customs documents — MSC Loreto and CMA CGM Bougainville need attention.`,
    },
    { id: 2, from: "user", text: "Which one is most urgent?" },
    {
      id: 3,
      from: "ai",
      text: `${highRisk} containers are inside the demurrage danger zone. Try "Status MSC Loreto" for a live readout.`,
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the chat feed when a message is appended.
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /** Generative-UI demo: the AI replies with a live tracking component. */
  function askShipmentStatus() {
    playSuccess();
    const base = Date.now();
    setMessages((m) => [
      ...m,
      { id: base, from: "user", text: "Status MSC Loreto" },
      {
        id: base + 1,
        from: "ai",
        text: "Here is the live status for container MSCU8492019:",
      },
      { id: base + 2, from: "ai", card: true },
    ]);
  }

  function appendUserText(text: string) {
    const base = Date.now();
    setMessages((m) => [
      ...m,
      { id: base, from: "user", text },
      {
        id: base + 1,
        from: "ai",
        text: "Noted — the companion is a preview prototype, but I'd action that on the live system.",
      },
    ]);
  }

  return (
    <motion.aside
      animate={{ width: open ? "19rem" : "3.25rem" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "shrink-0 h-full overflow-hidden flex flex-col",
        PREMIUM_CARD,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
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
            {/* Chat history — text + generative-UI bubbles */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto scroll-thin px-3 py-3 space-y-2.5"
            >
              {messages.map((m) =>
                m.card ? (
                  <div key={m.id} className="max-w-[94%]">
                    <ShipmentTrackingCard />
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[88%] px-3 py-2 text-xs leading-relaxed",
                      m.from === "ai"
                        ? "rounded-2xl rounded-tl-sm bg-brand/[0.07] border border-brand/15 text-foreground dark:bg-sky-500/[0.09] dark:border-sky-400/15 dark:shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                        : "ml-auto rounded-2xl rounded-tr-sm bg-slate-100 text-foreground dark:bg-white/[0.06]",
                    )}
                  >
                    {m.text}
                  </div>
                ),
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <QuickAction
                  label="Status MSC Loreto"
                  onClick={askShipmentStatus}
                />
                <QuickAction
                  label={t("auto.reviewDocs")}
                  onClick={() => {
                    playSuccess();
                    demoSuccess(
                      "Opening review",
                      "AI compiled the missing-document list.",
                    );
                  }}
                />
                <QuickAction
                  label={t("auto.contactCustomer")}
                  onClick={() => {
                    playSuccess();
                    demoSuccess(
                      "Drafts queued",
                      "AI prepared chase-emails for each exporter.",
                    );
                  }}
                />
              </div>
            </div>

            {/* Input — integrated, frosted */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem(
                  "msg",
                ) as HTMLInputElement;
                const value = input.value.trim();
                if (!value) return;
                if (/isabella|loreto|status/i.test(value)) {
                  askShipmentStatus();
                } else {
                  appendUserText(value);
                }
                input.value = "";
              }}
              className="shrink-0 border-t border-slate-200 dark:border-white/[0.06] p-2.5 flex items-center gap-2 backdrop-blur-md bg-white/50 dark:bg-black/20"
            >
              <input
                name="msg"
                type="text"
                placeholder={t("auto.ask")}
                className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-strong transition-colors shrink-0 shadow-[0_0_16px_-4px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
    <div
      className={cn(
        "p-4 flex items-center gap-3 transition-shadow",
        PREMIUM_CARD,
        "dark:hover:shadow-[0_0_18px_rgba(56,189,248,0.12)]",
      )}
    >
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            strokeWidth="4"
            className="stroke-slate-200 dark:stroke-white/10"
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
        <p className="font-display text-3xl font-light text-foreground tabular-nums leading-none tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="mt-1.5 text-[0.68rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
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
  data: { scanned: number; status: string; tone: Tone; micro: ReactNode };
}) {
  const t = useT();
  const { playHover } = useUiSounds();
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
      className="h-full"
    >
      <Link
        to={wf.to}
        onMouseEnter={playHover}
        className={cn(
          "group flex flex-col h-full p-5 overflow-hidden transition-all",
          PREMIUM_CARD,
          "hover:-translate-y-0.5 hover:shadow-md",
          "dark:hover:shadow-[0_0_32px_-10px_rgba(56,189,248,0.3)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        )}
      >
        <div className="flex items-center justify-between">
          <motion.span
            layoutId={`wf-icon-${wf.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_18px_-6px_var(--brand)]"
          >
            <Icon className="h-5 w-5 text-brand" />
          </motion.span>
          <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                dot,
                "dark:shadow-[0_0_8px_currentColor]",
              )}
            />
            Live
          </span>
        </div>

        <h3 className="mt-4 font-display text-base font-semibold text-foreground tracking-tight">
          {t(wf.titleKey)}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t(wf.descKey)}
        </p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-4xl font-light text-foreground tabular-nums tracking-tight">
            {data.scanned}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("auto.scannedToday")}
          </span>
        </div>

        {/* AI processing micro-component */}
        <div className="mt-3">{data.micro}</div>

        <p className="mt-2.5 text-xs font-medium text-foreground/70">
          {data.status}
        </p>

        <span className="mt-auto pt-5 inline-flex items-center gap-1 text-[0.78rem] font-semibold text-brand">
          {t("auto.viewDetails")}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </motion.div>
  );
}
