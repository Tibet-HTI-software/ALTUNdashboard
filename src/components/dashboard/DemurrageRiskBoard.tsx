import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Clock,
  Container,
  Loader2,
  MailWarning,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFreeTimeStatus,
  type FreeTimeRisk,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import {
  generateAiDraft,
  callSendAiWarning,
  type SendState,
} from "@/lib/dashboard/aiWarning";
import { demoSuccess } from "@/lib/dashboard/demo";
import { useAuth } from "@/lib/auth/AuthContext";
import { useUiSounds } from "@/hooks/useUiSounds";
import { supabase } from "@/lib/supabase";

const RISK_STYLE: Record<
  FreeTimeRisk,
  { ring: string; chip: string; dot: string }
> = {
  demurrage: {
    ring: "border-rose-500/40 bg-rose-500/[0.04]",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
  },
  critical: {
    ring: "border-rose-500/30 bg-rose-500/[0.03]",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
  warning: {
    ring: "border-amber-500/30 bg-amber-500/[0.03]",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500",
  },
  healthy: {
    ring: "border-border",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
};

const eur = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "EUR" });

type Filter = "all" | "atrisk";

/**
 * Ocean Freight Planner board — containers ranked by remaining terminal
 * free time, colour-coded by D&D risk.
 *
 * - Pass `onSelect` to open the full ShipmentDetailDrawer.
 * - "Alert Client" button on at-risk cards fires the AI warning email
 *   directly — one click, no drawer required. State is tracked per card.
 */
export function DemurrageRiskBoard({
  shipments,
  onSelect,
}: {
  shipments: OceanShipment[];
  onSelect?: (shipment: OceanShipment) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { thresholds } = useDemurrageThresholds();
  const { user: authUser } = useAuth();
  const { playSuccess } = useUiSounds();

  /** Per-card send states: shipment.id → SendState */
  const [alertStates, setAlertStates] = useState<Record<string, SendState>>(
    {},
  );

  // Re-render every 60s so the free-time countdown stays live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const ranked = useMemo(() => {
    return shipments
      .filter((s) => s.phase !== "Delivered")
      .map((s) => ({ s, ft: getFreeTimeStatus(s, thresholds) }))
      .sort((a, b) => a.ft.hoursLeft - b.ft.hoursLeft);
  }, [shipments, thresholds]);

  const counts = useMemo(() => {
    const c = { demurrage: 0, critical: 0, warning: 0, healthy: 0 };
    for (const r of ranked) c[r.ft.risk] += 1;
    return c;
  }, [ranked]);

  const totalExposure = useMemo(
    () => ranked.reduce((sum, r) => sum + r.ft.accruedEur, 0),
    [ranked],
  );

  const visible = ranked.filter((r) =>
    filter === "all" ? true : r.ft.risk !== "healthy",
  );

  /* ── Alert client handler ─────────────────────────────────────────────── */

  const handleAlert = useCallback(
    async (s: OceanShipment, ft: ReturnType<typeof getFreeTimeStatus>) => {
      const id = s.id;

      // Guard — already in-flight or sent
      const current = alertStates[id];
      if (
        current?.status === "approving" ||
        current?.status === "sent"
      )
        return;

      setAlertStates((prev) => ({ ...prev, [id]: { status: "approving" } }));

      /* Demo / mock bypass — no real user session */
      if (!authUser || (authUser as { mock?: boolean }).mock) {
        await new Promise((r) => setTimeout(r, 1500));
        setAlertStates((prev) => ({ ...prev, [id]: { status: "sent" } }));
        playSuccess();
        demoSuccess(
          "AI warning sent",
          `Alert email drafted for ${s.containerNumber} · ${s.trader}.`,
        );
        return;
      }

      /* Live path — call edge function */
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token ?? "";
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

        const result = await callSendAiWarning(s, ft, jwt, supabaseUrl);

        if (result.ok) {
          setAlertStates((prev) => ({
            ...prev,
            [id]: { status: "sent", messageId: result.messageId },
          }));
          playSuccess();
          demoSuccess(
            "AI warning sent",
            `Alert email sent for ${s.containerNumber}.`,
          );
        } else {
          setAlertStates((prev) => ({
            ...prev,
            [id]: { status: "failed", error: result.error ?? "Send failed." },
          }));
        }
      } catch (err) {
        setAlertStates((prev) => ({
          ...prev,
          [id]: {
            status: "failed",
            error: err instanceof Error ? err.message : "Unexpected error.",
          },
        }));
      }
    },
    [alertStates, authUser, playSuccess],
  );

  return (
    <div className="space-y-4">
      {/* Risk summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          tone="rose"
          label="In demurrage"
          value={counts.demurrage}
          hint={
            totalExposure > 0 ? `${eur(totalExposure)} accrued` : "No fines"
          }
        />
        <SummaryStat
          tone="rose"
          label={`Critical (<${thresholds.criticalH}h)`}
          value={counts.critical}
          hint="Free time almost gone"
        />
        <SummaryStat
          tone="amber"
          label={`Warning (<${thresholds.warningH}h)`}
          value={counts.warning}
          hint="Plan collection now"
        />
        <SummaryStat
          tone="emerald"
          label="Healthy"
          value={counts.healthy}
          hint="Comfortable free time"
        />
      </div>

      {/* Filter */}
      <div
        role="group"
        aria-label="Risk filter"
        className="inline-flex gap-1 rounded-lg bg-foreground/[0.04] p-1"
      >
        {(["all", "atrisk"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              filter === f
                ? "bg-brand text-white shadow-[0_2px_8px_-3px_var(--brand)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All containers" : "At risk only"}
          </button>
        ))}
      </div>

      {/* Container cards */}
      <motion.ul layout className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map(({ s, ft }) => {
            const style = RISK_STYLE[ft.risk];
            const alertState: SendState =
              alertStates[s.id] ?? { status: "idle" };
            const showAlert = ft.risk !== "healthy";

            return (
              <motion.li
                key={s.id}
                layout
                layoutId={`dd-${s.id}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "rounded-xl border p-4 card-premium",
                  style.ring,
                  onSelect &&
                    "cursor-pointer hover:ring-1 hover:ring-brand/30 hover:shadow-[0_0_0_1px_var(--brand)]/20 transition-shadow",
                )}
                onClick={() => onSelect?.(s)}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onKeyDown={
                  onSelect
                    ? (e) => e.key === "Enter" && onSelect(s)
                    : undefined
                }
                aria-label={
                  onSelect
                    ? `Open detail for ${s.containerNumber}`
                    : undefined
                }
              >
                {/* ── Card header ── */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Container className="h-4 w-4 text-brand shrink-0" />
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {s.containerNumber}
                      </span>
                      <span className="text-[0.65rem] font-medium text-muted-foreground">
                        {s.containerType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {s.trader} · {s.commodity}
                    </p>
                  </div>

                  {/* Risk chip + Alert button group */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[0.7rem] font-semibold",
                        style.chip,
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {ft.label}
                    </span>

                    {/* Alert Client button — visible for non-healthy cards */}
                    {showAlert && (
                      <AlertButton
                        state={alertState}
                        draft={generateAiDraft(s, ft)}
                        onAlert={(e) => {
                          e.stopPropagation(); // don't trigger onSelect
                          void handleAlert(s, ft);
                        }}
                        traderEmail={s.traderEmail}
                      />
                    )}
                  </div>
                </div>

                {/* ── Card fields ── */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <Field
                    icon={<Ship className="h-3 w-3" />}
                    label="Vessel"
                    value={`${s.vessel} · ${s.voyage}`}
                  />
                  <Field
                    icon={<Anchor className="h-3 w-3" />}
                    label="Route"
                    value={`${s.pol} → ${s.pod}`}
                  />
                  <Field label="Terminal" value={s.terminal} />
                  <Field
                    label="Demurrage rate"
                    value={`${eur(s.demurrageRatePerDay)}/day`}
                  />
                </div>

                {/* Demurrage accrual banner */}
                {ft.risk === "demurrage" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {eur(ft.accruedEur)} in demurrage fines already accrued.
                  </div>
                )}

                {/* Alert send-state feedback strip */}
                {alertState.status !== "idle" && (
                  <AlertFeedback state={alertState} />
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

/* ── Alert Client icon button ─────────────────────────────────────────────── */

function AlertButton({
  state,
  draft,
  onAlert,
  traderEmail,
}: {
  state: SendState;
  draft: { subject: string };
  onAlert: (e: React.MouseEvent) => void;
  traderEmail: string;
}) {
  const sent = state.status === "sent";
  const busy = state.status === "approving";
  const failed = state.status === "failed";

  return (
    <button
      type="button"
      onClick={onAlert}
      disabled={busy || sent}
      title={
        sent
          ? "Alert sent"
          : failed
            ? `Retry: ${(state as { error: string }).error}`
            : `Alert ${traderEmail || "client"} — ${draft.subject}`
      }
      aria-label="Alert client via AI email"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed",
        sent
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : failed
            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/15"
            : busy
              ? "border-brand/30 bg-brand/10 text-brand"
              : "border-border bg-foreground/[0.03] text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/[0.06] hover:text-amber-600 dark:hover:text-amber-300",
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : sent ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : failed ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <MailWarning className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/* ── Alert feedback strip shown below the card fields ────────────────────── */

function AlertFeedback({ state }: { state: SendState }) {
  if (state.status === "approving") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/[0.05] px-3 py-2 text-[0.68rem] text-brand">
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        Drafting and sending AI alert email…
      </div>
    );
  }
  if (state.status === "sent") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-[0.68rem] text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        AI alert email sent to client.
        {state.messageId && (
          <span className="font-mono text-[0.6rem] text-muted-foreground ml-auto">
            {state.messageId}
          </span>
        )}
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-[0.68rem] text-rose-600 dark:text-rose-300">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Send failed: {state.error} — click{" "}
        <MailWarning className="h-3 w-3 inline" /> to retry.
      </div>
    );
  }
  return null;
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function SummaryStat({
  tone,
  label,
  value,
  hint,
}: {
  tone: "rose" | "amber" | "emerald";
  label: string;
  value: number;
  hint: string;
}) {
  const dot =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="card-premium rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[0.62rem] uppercase tracking-wider text-muted-foreground/80">
        {icon}
        {label}
      </p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}
